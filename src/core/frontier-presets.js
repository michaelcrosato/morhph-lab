import { basePreset, createPart, validateGenome } from './genome.js';
import { defaultMotion } from './motion.js';
import { FRONTIER_MODELS } from './frontier-catalog.js';
import { SURFACE_PRESETS } from './surfaces.js';
/** New body graphs and appendage arrangements. +Z is forward. */
export function frontierPreset(id, seed = 7317) {
  const def = FRONTIER_MODELS.find(m => m.id === id);
  if (!def) throw new Error('Unknown Strange Forms model.');
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
  const eyes = (host = 'head', size = 0.6) => add('optic', host, [1, 0.3, 0.5], size, 1, 0, true);
  const skin = (color, accent, id) => {
    Object.assign(g.appearance, SURFACE_PRESETS[id], {
      color,
      accent,
      patternScale: 4,
      strength: 0.72,
      warp: 0.18,
    });
    delete g.appearance.label;
  };
  const motion = (clip, kind = 'rigid', amp = 0.15) => {
    g.motion = defaultMotion(clip);
    Object.assign(g.motion.travel, {
      medium: def.medium,
      speed: def.medium === 'air' ? 3.2 : 2.1,
      climb: 1.7,
    });
    Object.assign(g.motion.bodyWave, { kind, amplitude: amp, frequency: 0.65, wavelength: 3 });
  };
  switch (id) {
    case 'comblantern':
      g.nodes = [
        node('core', [0.72, 0.68, 0.92]),
        node('tip', [0.3, 0.29, 0.32], 'core', [0, 0, -0.67]),
      ];
      skin('#264e70', '#efb676', 'combglass');
      motion('combbeat');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add('combrail', 'core', [Math.cos(a), Math.sin(a), 0], 0.66, 0.82, i % 3, false, {
          phase: i / 8,
          material: i % 2 ? 'inherit' : 'glow',
        });
      }
      add('siphon', 'tip', [0, 0, -1], 0.45, 0.7, 0);
      eyes('core', 0.44);
      break;
    case 'salpchain': {
      g.nodes = [node('core', [0.26, 0.26, 0.4])];
      let parent = 'core';
      for (let i = 1; i <= 4; i++) {
        const name = 'unit' + i;
        g.nodes.push(node(name, [0.26, 0.26, 0.4], parent, [0, 0, -0.53]));
        parent = name;
      }
      skin('#558e93', '#daf0d5', 'colony');
      motion('chainpump', 'lateral', 0.11);
      g.motion.travel.speed = 1.6;
      for (let i = 0; i < 5; i++)
        add('pumpbarrel', i ? 'unit' + i : 'core', [0, 1, 0], 0.93, 1, 2, false, {
          phase: i * 0.17,
          socketOffset: [0, -0.32, 0],
        });
      add('branchfan', 'unit4', [0, 0, -1], 0.35, 0.72, 0);
      break;
    }
    case 'starweaver':
      g.nodes = [node('core', [0.37, 0.27, 0.38])];
      skin('#ad7068', '#efc895', 'starvelvet');
      motion('radialstroke');
      g.motion.travel.speed = 1.5;
      add('radialweb', 'core', [0, -1, 0], 1.0, 0.8, 0);
      add('pumpbarrel', 'core', [0, 1, 0], 0.4, 0.65, 0);
      eyes('core', 0.38);
      break;
    case 'velvetslug':
      g.nodes = [
        node('core', [0.48, 0.29, 0.85]),
        node('head', [0.33, 0.27, 0.38], 'core', [0, 0.01, 0.54]),
        node('rear', [0.3, 0.25, 0.55], 'core', [0, 0, -0.52]),
      ];
      skin('#4c4175', '#de83ac', 'branchhide');
      motion('radialstroke', 'lateral', 0.12);
      add('mantleskirt', 'core', [0, 1, 0], 0.88, 0.85, 0, false, {
        socketOffset: [0, -0.24, -0.3],
      });
      add('branchfan', 'rear', [0, 1, 0], 0.65, 0.84, 2);
      add('branchfan', 'head', [0.48, 1, 0.1], 0.35, 1, 0, true);
      eyes('head', 0.53);
      break;
    case 'oarshrimp':
      g.nodes = [
        node('core', [0.38, 0.38, 0.63]),
        node('head', [0.4, 0.33, 0.43], 'core', [0, 0, 0.54]),
        node('back1', [0.32, 0.32, 0.52], 'core', [0, 0, -0.47]),
        node('back2', [0.26, 0.29, 0.46], 'back1', [0, -0.09, -0.45]),
      ];
      skin('#aa6953', '#e4ceb2', 'mosaic');
      motion('metachronal', 'vertical', 0.1);
      g.motion.travel.speed = 3.2;
      add('swimmeret', 'core', [1, -0.45, -0.1], 0.67, 0.85, 1, true);
      add('swimmeret', 'back1', [1, -0.4, -0.1], 0.44, 0.7, 0, true, { phase: 0.25 });
      add('caudal', 'back2', [0, 0, -1], 0.58, 0.75, 0, false, { twist: Math.PI / 2 });
      add('branchfan', 'head', [0.65, 0.5, 1], 0.35, 1.1, 0, true);
      eyes('head', 0.75);
      break;
    case 'twinjet':
      g.nodes = [
        node('core', [0.36, 0.33, 0.56]),
        node('head', [0.26, 0.25, 0.29], 'core', [0, 0.12, 0.39]),
        node('leftpod', [0.27, 0.27, 0.55], 'core', [0.5, -0.06, -0.08]),
        node('rightpod', [0.27, 0.27, 0.55], 'core', [-0.5, -0.06, -0.08]),
      ];
      skin('#368783', '#d2edca', 'colony');
      motion('chainpump');
      add('pumpbarrel', 'leftpod', [0, 0, -1], 0.9, 1.05, 1, false, { phase: 0 });
      add('pumpbarrel', 'rightpod', [0, 0, -1], 0.9, 1.05, 1, false, { phase: 0.5 });
      add('combrail', 'core', [0, 1, 0], 0.4, 0.8, 2);
      eyes('head', 0.55);
      break;
    case 'hoopglider':
      g.nodes = [
        node('core', [0.29, 0.39, 0.59]),
        node('head', [0.25, 0.26, 0.3], 'core', [0, 0.02, 0.44]),
      ];
      skin('#d7d7c5', '#557f87', 'foilskin');
      motion('canopy');
      g.motion.travel.speed = 4.8;
      add('ringwing', 'core', [0, 1, -0.1], 1.12, 1.02, 1);
      add('tailfan', 'core', [0, 0, -1], 0.43, 0.9, 0, false, { twist: Math.PI / 2 });
      add('siphon', 'head', [0, 0, 1], 0.38, 0.75, 1);
      eyes('head', 0.43);
      break;
    case 'sievewisp':
      g.nodes = [node('core', [0.26, 0.55, 0.27])];
      skin('#b8b98e', '#f0e9ce', 'saltpaper');
      motion('canopy');
      g.motion.travel.speed = 1.3;
      add('pappus', 'core', [0, 1, 0], 1.13, 1.1, 1);
      add('branchfan', 'core', [0, -1, 0], 0.35, 1.4, 0);
      break;
    case 'prismkite':
      g.nodes = [
        node('core', [0.27, 0.52, 0.32]),
        node('keel', [0.25, 0.38, 0.25], 'core', [0, -0.48, 0]),
      ];
      skin('#397b85', '#e9b99a', 'mosaic');
      motion('canopy');
      g.motion.travel.speed = 2.8;
      add('sailcell', 'core', [0, 1, 0], 1.1, 1.1, 2);
      add('sailcell', 'core', [0, -1, 0], 0.48, 0.65, 0, false, { phase: 0.25 });
      eyes('core', 0.5);
      break;
    case 'screwdrifter':
      g.nodes = [
        node('core', [0.3, 0.65, 0.3]),
        node('lower', [0.26, 0.3, 0.26], 'core', [0, -0.54, 0]),
      ];
      skin('#746782', '#d8cbac', 'foilskin');
      motion('corkscrew');
      add('helixvane', 'core', [0, 1, 0], 1.05, 0.9, 1);
      add('branchfan', 'lower', [0, -1, 0], 0.4, 0.85, 0);
      break;
    case 'ductmanta':
      g.nodes = [
        node('core', [0.58, 0.26, 0.76]),
        node('head', [0.27, 0.26, 0.32], 'core', [0, 0.02, 0.53]),
      ];
      skin('#454e65', '#d7b774', 'mosaic');
      motion('turbines');
      g.motion.travel.speed = 5.2;
      add('ductfan', 'core', [1, 0.7, -0.1], 1.03, 1.0, 2, true);
      add('foldwing', 'core', [0.8, 0.05, -0.6], 0.46, 0.62, 0, true, { phase: 0.3 });
      add('tailfan', 'core', [0, 0, -1], 0.42, 0.65, 1, false, { twist: Math.PI / 2 });
      eyes('head', 0.58);
      break;
    case 'pleatdrake':
      g.nodes = [
        node('core', [0.29, 0.3, 0.52]),
        node('head', [0.28, 0.3, 0.38], 'core', [0, 0.09, 0.45]),
        node('rear1', [0.25, 0.27, 0.48], 'core', [0, 0, -0.42]),
        node('rear2', [0.25, 0.25, 0.45], 'rear1', [0, 0.06, -0.4]),
      ];
      skin('#b08d72', '#efdab6', 'pleatcloth');
      motion('concertina', 'vertical', 0.1);
      g.motion.travel.speed = 3.7;
      for (const [i, host] of ['core', 'rear1', 'rear2'].entries())
        add('foldwing', host, [1, 0.18, 0], 0.68 - i * 0.09, 1, i, true, { phase: i * 0.16 });
      add('helixvane', 'rear2', [0, 0, -1], 0.35, 0.55, 0);
      eyes('head', 0.58);
      break;
  }
  g.appearance.textureSeed = seed >>> 0;
  return validateGenome(g);
}
