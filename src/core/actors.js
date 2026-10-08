import { rng, clamp, hash } from './math.js';
import {
  PROPORTIONS,
  humanoidLayout,
  syncHumanoidBody,
  compatibilityReport,
  SOCKETS,
} from './humanoid.js';
import { HUMANOID_ACTIONS } from './humanoid-motion.js';
import { validateGenome, parseGenome } from './genome.js';

/** Role values are integration data. No AI, damage, or pathfinding is implied. */
export const ACTOR_ROLES = Object.freeze({
  civilian: {
    label: 'Civilian',
    faction: 'friendly',
    behavior: 'wander',
    health: 60,
    speed: 1,
    sight: 8,
    range: 1.2,
    damage: 0,
    cooldown: 2,
  },
  guard: {
    label: 'Guard',
    faction: 'friendly',
    behavior: 'patrol',
    health: 140,
    speed: 0.9,
    sight: 12,
    range: 1.6,
    damage: 18,
    cooldown: 1.3,
  },
  scout: {
    label: 'Scout',
    faction: 'neutral',
    behavior: 'patrol',
    health: 80,
    speed: 1.25,
    sight: 18,
    range: 1.5,
    damage: 12,
    cooldown: 0.9,
  },
  skirmisher: {
    label: 'Skirmisher',
    faction: 'hostile',
    behavior: 'chase',
    health: 70,
    speed: 1.2,
    sight: 12,
    range: 1.4,
    damage: 10,
    cooldown: 0.8,
  },
  brute: {
    label: 'Brute',
    faction: 'hostile',
    behavior: 'chase',
    health: 240,
    speed: 0.72,
    sight: 10,
    range: 2.3,
    damage: 35,
    cooldown: 2.2,
  },
  stalker: {
    label: 'Stalker',
    faction: 'hostile',
    behavior: 'chase',
    health: 90,
    speed: 1.1,
    sight: 15,
    range: 1.7,
    damage: 22,
    cooldown: 1.3,
  },
  sentinel: {
    label: 'Sentinel',
    faction: 'neutral',
    behavior: 'stationary',
    health: 300,
    speed: 0.65,
    sight: 14,
    range: 2,
    damage: 28,
    cooldown: 1.8,
  },
  caster: {
    label: 'Caster',
    faction: 'hostile',
    behavior: 'keep-distance',
    health: 85,
    speed: 0.9,
    sight: 18,
    range: 7,
    damage: 24,
    cooldown: 2.5,
  },
  monster: {
    label: 'Monster',
    faction: 'hostile',
    behavior: 'chase',
    health: 160,
    speed: 1,
    sight: 12,
    range: 1.8,
    damage: 20,
    cooldown: 1.4,
  },
});
export const ACTOR_RANGES = {
  health: [1, 2000],
  speed: [0.3, 2],
  sight: [1, 60],
  range: [0.3, 20],
  damage: [0, 250],
  cooldown: [0.1, 15],
};
export const BEHAVIORS = Object.freeze([
  'stationary',
  'wander',
  'patrol',
  'chase',
  'keep-distance',
]);
export function defaultActor(role = 'monster') {
  const { label, ...p } = ACTOR_ROLES[role] || ACTOR_ROLES.monster;
  return { role, ...p };
}
export function validateActor(raw = defaultActor()) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    !Object.hasOwn(ACTOR_ROLES, raw.role)
  )
    throw new Error('Invalid blueprint: unknown actor role.');
  const out = defaultActor(raw.role);
  for (const [key, list] of [
    ['faction', ['friendly', 'neutral', 'hostile']],
    ['behavior', BEHAVIORS],
  ]) {
    const value = raw[key] ?? out[key];
    if (!list.includes(value)) throw new Error('Invalid blueprint: unknown actor ' + key + '.');
    out[key] = value;
  }
  for (const [key, [lo, hi]] of Object.entries(ACTOR_RANGES)) {
    const v = raw[key] ?? out[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi)
      throw new Error('Invalid blueprint: actor ' + key + ' is out of range.');
    out[key] = v;
  }
  return out;
}
export function actorManifest(input) {
  const blueprint = validateGenome(input),
    human = blueprint.rig.family === 'humanoid';
  return {
    format: 'morph-lab-actor',
    version: 1,
    blueprint,
    contract: {
      units: 'metres',
      up: '+Y',
      forward: '+Z',
      rig: blueprint.rig.family,
      controller: 'dynamic-compound-upright',
      travel: { ...blueprint.motion.travel },
      bodyWave: { ...blueprint.motion.bodyWave },
      restHeight: human ? humanoidLayout(blueprint.rig).restHeight : null,
      sockets: human ? SOCKETS.filter(s => s !== 'body') : ['body'],
      actions: human
        ? Object.fromEntries(
            Object.entries(HUMANOID_ACTIONS).map(([k, v]) => [
              k,
              { duration: v.duration, mask: v.mask, events: v.events },
            ]),
          )
        : {},
      compatibility: compatibilityReport(blueprint),
      roleIsMetadata: true,
      geometry: 'generated-at-runtime',
      animations: 'procedural-at-runtime',
    },
  };
}
export function parseActorManifest(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > 1048576)
    throw new Error('Actor input exceeds 1 MB.');
  const raw = JSON.parse(text);
  if (raw?.format !== 'morph-lab-actor' || raw.version !== 1)
    throw new Error('Unsupported actor format.');
  return actorManifest(raw.blueprint);
}
/** Independent seeded variants; input is never changed. All outputs validate. */
export function generateActorBatch(input, { count = 6, seed = 8128, variation = 0.25 } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error('Use 1–24 actors per batch.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error('Batch seed must be an unsigned 32-bit integer.');
  if (!Number.isFinite(variation) || variation < 0 || variation > 1)
    throw new Error('Batch variation must be between 0 and 1.');
  const base = validateGenome(input),
    r = rng(seed),
    actors = [];
  for (let i = 0; i < count; i++) {
    const g = structuredClone(base);
    g.seed = (r() * 4294967296) >>> 0;
    g.appearance.textureSeed = g.seed;
    g.name = (base.name.slice(0, 34) + ' ' + String(i + 1).padStart(2, '0')).slice(0, 40);
    g.generation = Math.min(999999, g.generation + 1);
    if (g.rig.family === 'humanoid') {
      for (const [key, { min, max }] of Object.entries(PROPORTIONS)) {
        if (key === 'posture') continue;
        g.rig.proportions[key] = clamp(
          g.rig.proportions[key] * (1 + (r() - 0.5) * variation * 0.7),
          min,
          max,
        );
      }
      syncHumanoidBody(g);
    }
    for (const p of g.parts) {
      p.size = clamp(p.size * (1 + (r() - 0.5) * variation * 0.5), 0.35, 2.1);
      p.length = clamp(p.length * (1 + (r() - 0.5) * variation * 0.4), 0.45, 2);
    }
    g.motion.tempo = clamp(g.motion.tempo * (1 + (r() - 0.5) * variation * 0.3), 0.1, 3);
    g.appearance.patternScale = clamp(
      g.appearance.patternScale + (r() - 0.5) * variation * 2,
      2,
      12,
    );
    g.actor.health = clamp(
      Math.round(g.actor.health * (1 + (r() - 0.5) * variation * 0.5)),
      1,
      2000,
    );
    const actor = actorManifest(g);
    actors.push({
      id:
        'actor-' +
        hash(JSON.stringify([seed, i, g.seed]))
          .toString(16)
          .padStart(8, '0'),
      ...actor,
    });
  }
  return { format: 'morph-lab-roster', version: 1, seed, variation, actors };
}
export function parseActorInput(text) {
  // Import one actor or a plain blueprint. Roster selection is explicit in UI.
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > 1048576)
    throw new Error('Actor input exceeds 1 MB.');
  const raw = JSON.parse(text);
  return raw?.format === 'morph-lab-actor' ? parseActorManifest(text).blueprint : parseGenome(text);
}
export function parseActorRoster(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > 8388608)
    throw new Error('Roster input exceeds 8 MB.');
  const raw = JSON.parse(text);
  if (
    raw?.format !== 'morph-lab-roster' ||
    raw.version !== 1 ||
    !Array.isArray(raw.actors) ||
    raw.actors.length < 1 ||
    raw.actors.length > 24
  )
    throw new Error('Invalid actor roster. Use 1–24 entries.');
  if (
    !Number.isInteger(raw.seed) ||
    raw.seed < 0 ||
    raw.seed > 4294967295 ||
    !Number.isFinite(raw.variation) ||
    raw.variation < 0 ||
    raw.variation > 1
  )
    throw new Error('Invalid roster settings.');
  const used = new Set();
  const actors = raw.actors.map(entry => {
    if (
      typeof entry.id !== 'string' ||
      !/^actor-[a-zA-Z0-9_-]{1,48}$/.test(entry.id) ||
      used.has(entry.id)
    )
      throw new Error('Invalid or duplicate actor ID.');
    used.add(entry.id);
    return { id: entry.id, ...actorManifest(entry.blueprint) };
  });
  return {
    format: 'morph-lab-roster',
    version: 1,
    seed: raw.seed,
    variation: raw.variation,
    actors,
  };
}
