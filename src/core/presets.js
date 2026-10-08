import { FIELD_MODELS } from './field-catalog.js';
import { fieldPreset } from './field-presets.js';
import { BLOOM_MODELS } from './bloom-catalog.js';
import { bloomPreset } from './bloom-presets.js';
import { FRONTIER_MODELS } from './frontier-catalog.js';
import { frontierPreset } from './frontier-presets.js';
import { tidalPreset } from './tidal-presets.js';
import { TIDAL_MODELS } from './tidal-catalog.js';
import { expansionPreset } from './expansion-presets.js';
import { HUMANOID_CONTENT, CREATURE_CONTENT } from './content-pack.js';
import { HUMANOID_MODELS } from './humanoid.js';
import { humanoidPreset } from './humanoid-presets.js';
import { basePreset, createPart, validateGenome } from './genome.js';
import { defaultMotion } from './motion.js';
export const PRESET_MODELS = Object.freeze([
  { id: 'mossback', label: 'Mossback', note: 'Four-leg walker' },
  { id: 'skitter', label: 'Skitter', note: 'Six-leg crawler' },
  { id: 'sprout', label: 'Sprout', note: 'Two-leg seedling' },
  { id: 'carapace', label: 'Carapace', note: 'Armored crawler' },
  { id: 'glider', label: 'Glider', note: 'Winged creature' },
  { id: 'reef', label: 'Reef drifter', note: 'Gill and fin body' },
  { id: 'tendril', label: 'Tendril', note: 'Tentacle cluster' },
  { id: 'sentinel', label: 'Sentinel', note: 'Spined club tail' },
  { id: 'grazer', label: 'Grazer', note: 'Long-body walker' },
  { id: 'lantern', label: 'Lantern', note: 'Glowing feelers' },
  { id: 'thornling', label: 'Thornling', note: 'Frilled seedling' },
  { id: 'burrower', label: 'Burrower', note: 'Claws and mandibles' },
  ...CREATURE_CONTENT,
  ...HUMANOID_MODELS,
  ...TIDAL_MODELS,
  ...FRONTIER_MODELS,
  ...BLOOM_MODELS,
  ...FIELD_MODELS,
]);
export function preset(which = 'mossback', seed = 1042) {
  if (FIELD_MODELS.some(p => p.id === which)) return fieldPreset(which, seed);
  if (BLOOM_MODELS.some(p => p.id === which)) return bloomPreset(which, seed);
  if (FRONTIER_MODELS.some(p => p.id === which)) return frontierPreset(which, seed);
  if (TIDAL_MODELS.some(p => p.id === which)) return tidalPreset(which, seed);
  if ([...HUMANOID_CONTENT, ...CREATURE_CONTENT].some(p => p.id === which))
    return expansionPreset(which, seed);
  if (HUMANOID_MODELS.some(p => p.id === which)) return humanoidPreset(which, seed);
  if (!PRESET_MODELS.some(p => p.id === which))
    throw new Error('Unknown creature preset: ' + which);
  if (['mossback', 'skitter', 'sprout'].includes(which)) return basePreset(which, seed);
  const g = basePreset(
    ['tendril', 'lantern', 'thornling'].includes(which)
      ? 'sprout'
      : which === 'carapace'
        ? 'skitter'
        : 'mossback',
    seed,
  );
  g.name = PRESET_MODELS.find(p => p.id === which).label;
  const add = (type, host = 'core', anchor = null, size = 1, length = 1, variant = 0) => {
    const p = createPart(g, type, host, anchor);
    Object.assign(p, { size, length, variant });
    g.parts.push(p);
    return p;
  };
  const remove = (...types) => {
    g.parts = g.parts.filter(p => !types.includes(p.type));
  };
  const skin = (color, accent, pattern, micro = 'pores') =>
    Object.assign(g.appearance, { color, accent, pattern, micro });
  if (which === 'carapace') {
    remove('fin');
    add('shell', 'core', [0, 1, -0.15], 1.35, 1.5);
    add('mandible', 'head', [0.7, -0.3, 1], 0.85);
    add('antenna', 'head', [0.5, 0.8, 0.6], 0.7, 1.4);
    skin('#467b76', '#b9dfa0', 'cells', 'ridges');
    g.appearance.metalness = 0.2;
    g.motion = defaultMotion('creep');
  }
  if (which === 'glider') {
    remove('horn');
    g.nodes[0].radii = [0.64, 0.64, 1.25];
    add('wing', 'core', [1, 0.55, -0.1], 1.2, 1.35);
    add('crest', 'head', [0, 1, 0], 0.65, 0.8);
    skin('#bb735f', '#efc780', 'chevron');
    g.motion = defaultMotion('hover');
  }
  if (which === 'reef') {
    remove('leg', 'horn');
    add('gill', 'head', [1, 0.2, 0], 1.1, 1.15);
    add('fin', 'core', [0, 1, -0.2], 1.3, 1.5);
    add('frill', 'core', [1, 0, -0.7], 0.8);
    skin('#438eab', '#e9b3af', 'marble');
    g.motion = defaultMotion('swim');
  }
  if (which === 'tendril') {
    remove('leg', 'fin', 'tail');
    for (const z of [-0.65, 0.05, 0.7]) add('tentacle', 'core', [1, -0.7, z], 0.85, 1.3);
    add('antenna', 'core', [0.5, 1, 0.2], 0.8, 1.1);
    skin('#8b73aa', '#dbc2e3', 'rings');
    g.motion = defaultMotion('swim');
  }
  if (which === 'sentinel') {
    remove('tail', 'horn');
    add('clubtail', 'core', null, 1.1, 1.2);
    add('crest', 'core', [0, 1, -0.2], 1.3, 1.25);
    add('shell', 'head', [0, 1, -0.4], 0.7, 0.65);
    skin('#66775e', '#e4c889', 'cracks', 'pebbles');
    g.motion = defaultMotion('walk');
  }
  if (which === 'grazer') {
    g.nodes[0].radii = [0.9, 0.82, 1.5];
    g.nodes[1].offset = [0, 0.25, 1.06];
    remove('horn');
    add('horn', 'head', [0.6, 1, 0.1], 1.05, 1.45, 1);
    add('gill', 'head', [1, 0.2, -0.4], 0.5, 0.7);
    skin('#987f56', '#e5d4a0', 'stripes', 'scales');
    g.motion = defaultMotion('walk');
  }
  if (which === 'lantern') {
    remove('fin');
    add('antenna', 'core', [0.5, 1, 0.2], 1.25, 1.5, 2);
    add('frill', 'core', [1, 0, -0.1], 0.8, 0.85);
    skin('#526789', '#b1e9d8', 'speckle');
    g.appearance.emission = 0.55;
    g.motion = defaultMotion('display');
  }
  if (which === 'thornling') {
    remove('fin');
    add('crest', 'core', [0, 1, 0], 0.95);
    add('frill', 'core', [1, 0.15, 0.6], 0.9, 1.15);
    add('horn', 'core', [0.7, 0.7, -0.45], 0.7, 0.8, 2);
    skin('#788e5e', '#eacb88', 'scales', 'scales');
    g.motion = defaultMotion('bound');
  }
  if (which === 'burrower') {
    remove('horn', 'tail');
    add('claw', 'core', [1, -0.1, 0.75], 1.1, 1.05);
    add('mandible', 'head', [0.55, -0.3, 1], 0.8);
    add('shell', 'core', [0, 1, -0.3], 1.25, 1.1);
    skin('#907269', '#d9a581', 'cells', 'ridges');
    g.motion = defaultMotion('creep');
  }
  return validateGenome(g);
}
