/** Seeded discovery recipes. This module does not use a renderer or browser state. */
import {
  preset,
  PRESET_MODELS,
  validateGenome,
  mutate,
  LIMITS,
  genomeFingerprint,
} from '../core/genome.js';
import { mixGenomes, defaultMixSettings } from '../core/mixer.js';
import { PALETTES } from '../core/catalog.js';
import { SURFACE_PRESETS } from '../core/surfaces.js';
import { rng, clamp } from '../core/math.js';

export const CREATOR_VERSION = 1;
export const TRAITS = Object.freeze({
  body: 'Body',
  head: 'Head parts',
  parts: 'Other parts',
  surface: 'Surface',
  pigment: 'Colors',
  motion: 'Motion',
});
export const SCOPES = Object.freeze({
  creatures: 'All creatures',
  ground: 'Land creatures',
  water: 'Swimmers',
  air: 'Fliers',
  humanoid: 'Humanoids',
  all: 'Everything',
});
const clone = structuredClone;
const heads = new Set([
  'eye',
  'mouth',
  'ear',
  'beak',
  'muzzle',
  'mandible',
  'faceplate',
  'flusheye',
  'feedingport',
]);
export const partTrait = p => (p.host === 'head' || heads.has(p.type) ? 'head' : 'parts');
export const defaultLocks = () => Object.fromEntries(Object.keys(TRAITS).map(k => [k, false]));
export const defaultChannels = (value = 0.5) =>
  Object.fromEntries(Object.keys(TRAITS).map(k => [k, value]));
export function checkedSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be a whole number from 0 to 4294967295.');
  return seed;
}
export function checkedTraits(raw, locks = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Trait settings must be an object.');
  const out = {};
  for (const key of Object.keys(TRAITS)) {
    const value = raw[key] ?? (locks ? false : 0.5);
    if (locks ? typeof value !== 'boolean' : !Number.isFinite(value) || value < 0 || value > 1)
      throw new Error('Invalid trait setting: ' + key);
    out[key] = value;
  }
  return out;
}
// Read real recipe metadata. Older catalog rows do not all contain travel fields.
export const CREATOR_MODELS = Object.freeze(
  PRESET_MODELS.map(m => {
    const g = preset(m.id);
    return Object.freeze({ ...m, family: g.rig.family, medium: g.motion.travel.medium });
  }),
);
export function eligibleModels(scope = 'creatures') {
  if (!Object.hasOwn(SCOPES, scope)) throw new Error('Unknown discovery scope.');
  return CREATOR_MODELS.filter(
    m =>
      scope === 'all' ||
      (scope === 'humanoid'
        ? m.family === 'humanoid'
        : m.family === 'creature' && (scope === 'creatures' || m.medium === scope)),
  );
}
function candidateSource(source, seed) {
  seed = seed >>> 0;
  const r = rng(seed),
    g = mutate(source, seed),
    palette = PALETTES[Math.floor(r() * PALETTES.length)];
  g.appearance.color = palette.color;
  g.appearance.accent = palette.accent;
  const surfaces = Object.values(SURFACE_PRESETS),
    surface = surfaces[Math.floor(r() * surfaces.length)];
  for (const key of ['pattern', 'roughness', 'metalness', 'relief', 'micro', 'emission'])
    if (surface[key] !== undefined) g.appearance[key] = surface[key];
  g.appearance.layers = [];
  g.appearance.patternScale = 2 + r() * 10;
  g.appearance.textureSeed = seed;
  for (const p of g.parts) {
    p.variant = Math.floor(r() * 3);
    p.phase = r();
    p.bend = clamp(p.bend + (r() - 0.5) * 0.4, -1, 1);
  }
  // Keep the source's medium and mechanism. Only change their rate and gains.
  g.motion.tempo = clamp(g.motion.tempo * (0.65 + r() * 0.8), 0.1, 3);
  g.motion.stride = clamp(g.motion.stride * (0.8 + r() * 0.4), 0.1, 2);
  return validateGenome(g);
}
/** Locks are applied against a fixed snapshot, not the last slider preview.
 * Attachment locks also hold the body to keep exact host IDs and socket meaning. */
export function blendTraits(
  sourceA,
  sourceB,
  { channels = defaultChannels(), locks = defaultLocks(), seed = 1042 } = {},
  frozen = sourceA,
) {
  const a = validateGenome(sourceA),
    b = validateGenome(sourceB),
    keep = validateGenome(frozen),
    c = checkedTraits(channels),
    l = checkedTraits(locks, true);
  checkedSeed(seed);
  const s = defaultMixSettings();
  s.seed = seed;
  s.channels = {
    body: c.body,
    parts: c.parts,
    pigment: c.pigment,
    surface: c.surface,
    motion: c.motion,
  };
  s.locks = {
    body: l.body || l.head || l.parts,
    parts: false,
    pigment: l.pigment,
    surface: l.surface,
    motion: l.motion,
  };
  const blended = mixGenomes(a, b, s, keep),
    g = blended.genome,
    notes = [...blended.notes];
  const h = mixGenomes(a, b, { ...s, channels: { ...s.channels, parts: c.head } }, keep).genome;
  let selected = [
    ...h.parts.filter(p => partTrait(p) === 'head'),
    ...g.parts.filter(p => partTrait(p) === 'parts'),
  ];
  // Preserve locked IDs first. Unlocked genes get deterministic collision-free IDs.
  const locked = keep.parts.filter(p => l[partTrait(p)]).map(p => clone(p));
  selected = selected.filter(p => !l[partTrait(p)]);
  if (locked.length + selected.length > LIMITS.parts)
    notes.push('The 32-gene limit retained locked parts and the strongest remaining parts.');
  selected = selected
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.presence - a.p.presence || a.i - b.i)
    .slice(0, LIMITS.parts - locked.length)
    .sort((a, b) => a.i - b.i)
    .map(x => x.p);
  const used = new Set([...g.nodes, ...locked].map(x => x.id));
  let serial = 1;
  for (const p of selected) {
    if (used.has(p.id)) {
      while (used.has('discovery-part-' + serial)) serial++;
      p.id = 'discovery-part-' + serial++;
    }
    used.add(p.id);
  }
  g.parts = [...locked, ...selected];
  if (l.head || l.parts)
    notes.push('Attachment locks also hold the body and rig so saved mounts stay valid.');
  // The source seed influences geometry. Keep it when any geometry group is locked.
  if (l.body || l.head || l.parts) g.seed = keep.seed;
  return { genome: validateGenome(g), notes: [...new Set(notes)] };
}
function rename(g, seed, kind) {
  const adjectives = [
    'Moss',
    'Amber',
    'Dusk',
    'Coral',
    'Mist',
    'Bramble',
    'Jade',
    'Cinder',
    'Moon',
    'Reed',
    'Ochre',
    'Silver',
  ];
  const nouns = {
    ground: ['prowler', 'hopper', 'grazer', 'crawler'],
    water: ['drifter', 'swimmer', 'skimmer', 'ribbon'],
    air: ['glider', 'wisp', 'sail', 'kite'],
  };
  const r = rng(seed ^ 0xadd123),
    words =
      g.rig.family === 'humanoid'
        ? ['wanderer', 'keeper', 'scout', 'warden']
        : nouns[g.motion.travel.medium] || nouns.ground;
  if (kind === 'random')
    g.name =
      adjectives[Math.floor(r() * adjectives.length)] +
      ' ' +
      words[Math.floor(r() * words.length)] +
      ' ' +
      seed.toString(36).slice(-3).toUpperCase();
}
/** Return a complete recipe with its source snapshots. A seed alone is not an asset. */
export function generateDiscovery(
  source,
  {
    kind = 'random',
    seed = 1042,
    strength = 0.35,
    scope = 'creatures',
    trait = null,
    locks = defaultLocks(),
  } = {},
) {
  const current = validateGenome(source);
  checkedSeed(seed);
  if (!['random', 'variation', 'trait'].includes(kind))
    throw new Error('Unknown discovery operation.');
  if (!Number.isFinite(strength) || strength < 0 || strength > 1)
    throw new Error('Variation amount must be between 0 and 1.');
  if (kind === 'trait' && !Object.hasOwn(TRAITS, trait)) throw new Error('Choose a valid trait.');
  const l = checkedTraits(locks, true),
    r = rng(seed),
    pool = eligibleModels(scope);
  if (kind === 'trait' && trait === 'body' && (l.head || l.parts))
    throw new Error('Unlock head parts and other parts before rolling the body.');
  if (kind === 'trait') for (const key of Object.keys(TRAITS)) if (key !== trait) l[key] = true;
  let candidates =
    kind === 'random'
      ? pool
      : CREATOR_MODELS.filter(
          m => m.family === current.rig.family && m.medium === current.motion.travel.medium,
        );
  if (!candidates.length) throw new Error('No source models match these settings.');
  const selected = candidates[Math.floor(r() * candidates.length)];
  const base = kind === 'random' ? preset(selected.id, seed) : current;
  const donor = candidateSource(
    kind === 'random' || (kind === 'trait' && trait === 'motion')
      ? preset(selected.id, seed)
      : base,
    seed,
  );
  let a = current,
    b = donor,
    channels = defaultChannels(kind === 'random' ? 1 : strength);
  if (kind === 'variation') {
    // Blend a small amount of compatible donor anatomy into a mutated parent.
    const other = candidateSource(preset(selected.id, seed), seed ^ 0x314159);
    b = blendTraits(
      donor,
      other,
      { channels: { ...defaultChannels(strength * 0.45), body: strength * 0.15 }, seed },
      donor,
    ).genome;
  }
  if (kind === 'trait') {
    channels = defaultChannels(0);
    channels[trait] = 1;
  }
  const result = blendTraits(a, b, { channels, locks: l, seed }, current);
  if (kind === 'trait' && trait === 'body' && !l.body) {
    result.genome.nodes = clone(donor.nodes);
    result.genome.rig = clone(donor.rig);
    result.genome = validateGenome(result.genome);
    result.notes = result.notes.filter(n => !n.startsWith('Attachment locks'));
  }
  rename(result.genome, seed, kind);
  if (kind !== 'random') result.genome.name = current.name;
  // Strength zero is an exact no-op; it does not create history or change the name.
  if (kind === 'variation' && strength === 0) result.genome = clone(current);
  const recipe = {
    format: 'morph-lab-discovery-recipe',
    version: CREATOR_VERSION,
    kind,
    seed,
    scope,
    strength,
    trait,
    sources: { a, b },
    frozen: current,
    channels,
    locks: l,
    result: clone(result.genome),
    notes: result.notes,
  };
  return { ...result, recipe };
}
export function generateBatch(source, options = {}, count = 6) {
  if (!Number.isInteger(count) || count < 1 || count > 6)
    throw new Error('A batch needs 1–6 candidates.');
  const base = validateGenome(source),
    seed = checkedSeed(options.seed ?? 1042);
  return Array.from({ length: count }, (_, i) =>
    generateDiscovery(base, {
      ...options,
      kind: 'variation',
      seed: (seed + Math.imul(i, 2654435761)) >>> 0,
    }),
  );
}
export function mixDiscovery(
  a,
  b,
  { channels = defaultChannels(), locks = defaultLocks(), seed = 1042 } = {},
  frozen = a,
) {
  const result = blendTraits(a, b, { channels, locks, seed }, frozen);
  return {
    ...result,
    recipe: {
      format: 'morph-lab-discovery-recipe',
      version: CREATOR_VERSION,
      kind: 'mix',
      seed: checkedSeed(seed),
      sources: { a: validateGenome(a), b: validateGenome(b) },
      frozen: validateGenome(frozen),
      channels: checkedTraits(channels),
      locks: checkedTraits(locks, true),
      result: clone(result.genome),
      notes: result.notes,
    },
  };
}
export function replayRecipe(raw) {
  if (
    !raw ||
    raw.format !== 'morph-lab-discovery-recipe' ||
    raw.version !== CREATOR_VERSION ||
    !['random', 'variation', 'trait', 'mix'].includes(raw.kind)
  )
    throw new Error('Unsupported discovery recipe.');
  if (
    raw.kind !== 'mix' &&
    (!Object.hasOwn(SCOPES, raw.scope) ||
      !Number.isFinite(raw.strength) ||
      raw.strength < 0 ||
      raw.strength > 1 ||
      (raw.kind === 'trait' && !Object.hasOwn(TRAITS, raw.trait)))
  )
    throw new Error('Invalid discovery recipe settings.');
  const a = validateGenome(raw.sources?.a),
    b = validateGenome(raw.sources?.b),
    frozen = validateGenome(raw.frozen),
    seed = checkedSeed(raw.seed),
    channels = checkedTraits(raw.channels),
    locks = checkedTraits(raw.locks, true);
  const result = blendTraits(a, b, { channels, locks, seed }, frozen);
  if (raw.kind === 'trait' && raw.trait === 'body' && !locks.body) {
    result.genome.nodes = clone(b.nodes);
    result.genome.rig = clone(b.rig);
    result.genome = validateGenome(result.genome);
    result.notes = result.notes.filter(n => !n.startsWith('Attachment locks'));
  }
  rename(result.genome, seed, raw.kind);
  if (raw.kind === 'variation' && raw.strength === 0) result.genome = clone(frozen);
  // A renamed discovery can carry a new display name without changing the recipe.
  const expected = validateGenome(raw.result);
  result.genome.name = expected.name;
  if (JSON.stringify(result.genome) !== JSON.stringify(expected))
    throw new Error('Recipe result does not match its source snapshots and settings.');
  return {
    ...result,
    recipe: {
      format: raw.format,
      version: CREATOR_VERSION,
      kind: raw.kind,
      seed,
      scope: Object.hasOwn(SCOPES, raw.scope) ? raw.scope : 'all',
      strength: raw.strength ?? 0.5,
      trait: Object.hasOwn(TRAITS, raw.trait) ? raw.trait : null,
      sources: { a, b },
      frozen,
      channels,
      locks,
      result: expected,
      notes: result.notes,
    },
  };
}
/** Content signature of a blueprint; equal blueprints share thumbnails and ids. */
export const discoverySignature = genomeFingerprint;
