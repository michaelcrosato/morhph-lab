import { validateRig, humanoidNodes, syncHumanoidBody, SOCKETS, PROPORTIONS } from './humanoid.js';
import { validateActor } from './actors.js';
import { CATALOG, PALETTES, PART_MATERIALS } from './catalog.js';
import { normalize, rng, clamp, hash } from './math.js';
import { defaultMotion, validateMotion } from './motion.js';
import { PATTERNS, MICRO_SURFACES } from './surfaces.js';
import { resolveNodes } from './anatomy.js';
export const SCHEMA_VERSION = 6;
export const LIMITS = { nodes: 8, parts: 32, fileBytes: 262144 };
const identifier = /^[a-zA-Z0-9_-]{1,48}$/;
function fail(message) {
  throw new Error('Invalid blueprint: ' + message);
}
function number(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    fail(`${label} must be between ${min} and ${max}.`);
  return value;
}
function vector(v, min, max, label) {
  if (!Array.isArray(v) || v.length !== 3) fail(label + ' must have three numbers.');
  return v.map(n => number(n, min, max, label));
}
function id(v, label) {
  if (typeof v !== 'string' || !identifier.test(v)) fail(label + ' is invalid.');
  return v;
}
function color(v) {
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v))
    fail('colors must be six-digit hexadecimal.');
  return v.toLowerCase();
}
/** Validate AND reconstruct allowed fields. No object spreading of imported data,
 * no executable hooks, no unknown part types and no silently accepted versions. */
export function validateGenome(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('expected an object.');
  if (![1, 2, 3, 4, 5, SCHEMA_VERSION].includes(raw.version))
    fail('unsupported schema version. Expected a schema version from 1 to 6.');
  const rig = validateRig(raw.rig);
  if (typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 40)
    fail('name must be 1–40 characters.');
  if (!Array.isArray(raw.nodes) || raw.nodes.length < 1 || raw.nodes.length > LIMITS.nodes)
    fail('use 1–8 body nodes.');
  if (!Array.isArray(raw.parts) || raw.parts.length > LIMITS.parts)
    fail('use at most 32 part genes.');
  if (!Number.isInteger(raw.seed)) fail('seed must be an integer.');
  if (raw.generation !== undefined && !Number.isInteger(raw.generation))
    fail('generation must be an integer.');
  const used = new Set();
  const nodes = raw.nodes.map(n => {
    if (!n || typeof n !== 'object') fail('invalid body node.');
    const node = {
      id: id(n.id, 'node id'),
      parent: n.parent === null ? null : id(n.parent, 'parent'),
      offset: vector(n.offset, -3, 3, 'node offset'),
      radii: vector(n.radii, rig.family === 'humanoid' ? 0.12 : 0.25, 2.4, 'body radii'),
    };
    if (used.has(node.id)) fail('duplicate id ' + node.id);
    used.add(node.id);
    return node;
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (nodes.filter(n => n.parent === null).length !== 1) fail('exactly one root body is required.');
  for (const n of nodes) {
    const seen = new Set([n.id]);
    let p = n.parent;
    while (p !== null) {
      if (!byId.has(p)) fail('missing parent ' + p);
      if (seen.has(p)) fail('body hierarchy contains a cycle.');
      seen.add(p);
      p = byId.get(p).parent;
    }
  }
  const resolved = resolveNodes({ nodes });
  for (const n of resolved) {
    if (n.center.some((v, i) => Math.abs(v) + n.radii[i] > 7))
      fail('body exceeds the 14 metre workspace.');
    if (n.parent && rig.family !== 'humanoid') {
      const p = resolved.find(x => x.id === n.parent);
      const d = Math.hypot(...n.offset);
      if (d > Math.min(...n.radii) + Math.min(...p.radii) + 0.05)
        fail('body segments must overlap their parent. Move the segment closer.');
    }
  }
  if (rig.family === 'humanoid') {
    const expected = humanoidNodes(rig);
    if (
      nodes.length !== expected.length ||
      expected.some(e => {
        const n = byId.get(e.id);
        return (
          !n ||
          n.parent !== e.parent ||
          ['offset', 'radii'].some(k => e[k].some((v, i) => Math.abs(v - n[k][i]) > 1e-6))
        );
      })
    )
      fail(
        'humanoid body nodes must match rig proportions. Use the Actor panel to change the body.',
      );
  }
  const parts = raw.parts.map(p => {
    if (!p || typeof p !== 'object' || !Object.hasOwn(CATALOG, p.type)) fail('unknown part type.');
    const part = {
      id: id(p.id, 'part id'),
      type: p.type,
      host: id(p.host, 'attachment host'),
      anchor: vector(p.anchor, -1, 1, 'anchor'),
      size: number(p.size, 0.35, 2.1, 'part size'),
      length: number(p.length, 0.45, 2, 'part length'),
      twist: number(p.twist, -Math.PI, Math.PI, 'twist'),
      mirror: p.mirror,
      flex: number(p.flex ?? 1, 0, 2, 'part flex'),
      phase: number(p.phase ?? 0, 0, 1, 'part phase'),
      bend: number(p.bend ?? 0, -1, 1, 'part bend'),
      variant: number(p.variant ?? 0, 0, 2, 'part variant'),
      presence: number(p.presence ?? 1, 0, 1, 'part presence'),
    };
    if (!PART_MATERIALS.includes(p.material ?? 'inherit')) fail('unknown part material.');
    part.material = p.material ?? 'inherit';
    if (!SOCKETS.includes(p.socket ?? 'body')) fail('unknown attachment socket.');
    part.socket = p.socket ?? 'body';
    part.socketOffset = vector(p.socketOffset ?? [0, 0, 0], -1, 1, 'socket offset');
    if (!Number.isInteger(part.variant)) fail('part variant must be an integer.');
    if (used.has(part.id)) fail('duplicate id ' + part.id);
    used.add(part.id);
    if (!byId.has(part.host)) fail('part attached to missing body node.');
    if (Math.hypot(...part.anchor) < 0.01) fail('anchor cannot be zero.');
    if (typeof part.mirror !== 'boolean') fail('mirror must be true or false.');
    if (Math.abs(Math.hypot(...part.anchor) - 1) > 1e-12) part.anchor = normalize(part.anchor);
    return part;
  });
  const a = raw.appearance;
  if (!a || !PATTERNS.includes(a.pattern)) fail('unknown surface pattern.');
  const extra = a.layers ?? [];
  if (!Array.isArray(extra) || extra.length > 3) fail('use at most four pigment layers.');
  const layer = l => {
    if (!l || !PATTERNS.includes(l.pattern)) fail('unknown layer pattern.');
    return {
      pattern: l.pattern,
      scale: number(l.scale, 2, 12, 'layer scale'),
      weight: number(l.weight, 0, 1, 'layer weight'),
      angle: number(l.angle ?? 0, -Math.PI, Math.PI, 'layer angle'),
      warp: number(l.warp ?? 0.45, 0, 2, 'layer warp'),
    };
  };
  if (!Number.isInteger(a.textureSeed ?? raw.seed)) fail('texture seed must be an integer.');
  if (!MICRO_SURFACES.includes(a.micro ?? 'pores')) fail('unknown micro surface.');
  return {
    version: SCHEMA_VERSION,
    rig,
    actor: validateActor(raw.actor),
    name: raw.name.trim(),
    seed: number(raw.seed, 0, 4294967295, 'seed') >>> 0,
    generation: Math.floor(number(raw.generation ?? 0, 0, 999999, 'generation')),
    nodes,
    parts,
    appearance: {
      color: color(a.color),
      accent: color(a.accent),
      pattern: a.pattern,
      roughness: number(a.roughness, 0.2, 1, 'roughness'),
      patternScale: number(a.patternScale, 2, 12, 'pattern scale'),
      weight: number(a.weight ?? 1, 0, 1, 'base pattern weight'),
      angle: number(a.angle ?? 0, -Math.PI, Math.PI, 'pattern angle'),
      warp: number(a.warp ?? 0.45, 0, 2, 'pattern warp'),
      strength: number(a.strength ?? 0.78, 0, 1, 'pigment strength'),
      metalness: number(a.metalness ?? 0.025, 0, 1, 'metalness'),
      relief: number(a.relief ?? 0.022, 0, 0.15, 'surface relief'),
      emission: number(a.emission ?? 0, 0, 2, 'emission'),
      micro: a.micro ?? 'pores',
      textureSeed: number(a.textureSeed ?? raw.seed, 0, 4294967295, 'texture seed'),
      layers: extra.map(layer),
    },
    motion: validateMotion(raw.motion),
  };
}
export function nextId(g, prefix = 'part') {
  let i = 1;
  const ids = new Set([...g.nodes, ...g.parts].map(n => n.id));
  while (ids.has(prefix + '-' + i)) i++;
  return prefix + '-' + i;
}
export function createPart(g, type, host, anchor, mirror) {
  if (!Object.hasOwn(CATALOG, type)) throw new Error('Unknown part ' + type);
  const def = CATALOG[type];
  return {
    id: nextId(g),
    type,
    host: host || g.nodes[0].id,
    anchor: normalize(anchor || def.anchor),
    size: def.size,
    length: def.length,
    twist: 0,
    mirror: mirror ?? def.mirror,
    flex: 1,
    phase: 0,
    bend: 0,
    variant: 0,
    presence: 1,
    material: 'inherit',
    socket: g.rig?.family === 'humanoid' ? (def.socket ?? 'body') : 'body',
    socketOffset: [0, 0, 0],
  };
}
export function removeGene(g, id) {
  if (g.rig?.family === 'humanoid' && g.nodes.some(n => n.id === id))
    throw new Error('Humanoid body nodes are rig-owned. Use Actor proportions.');
  const root = g.nodes.find(n => !n.parent);
  if (id === root.id) throw new Error('The root body cannot be removed.');
  const deleted = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of g.nodes)
      if (deleted.has(n.parent) && !deleted.has(n.id)) {
        deleted.add(n.id);
        changed = true;
      }
  }
  g.nodes = g.nodes.filter(n => !deleted.has(n.id));
  g.parts = g.parts.filter(p => !deleted.has(p.id) && !deleted.has(p.host));
  return g;
}
export function basePreset(which = 'mossback', seed = 1042) {
  let g = {
    version: 1,
    name: 'Mossback',
    seed: seed >>> 0,
    generation: 0,
    nodes: [
      { id: 'core', parent: null, offset: [0, 0, 0], radii: [0.85, 0.78, 1.18] },
      { id: 'head', parent: 'core', offset: [0, 0.16, 0.96], radii: [0.67, 0.64, 0.7] },
    ],
    parts: [],
    appearance: { ...PALETTES[0], pattern: 'spots', roughness: 0.57, patternScale: 5.4 },
  };
  function add(type, host, anchor, size = 1, len = 1, mirror = CATALOG[type].mirror) {
    const p = createPart(g, type, host, anchor, mirror);
    p.size = size;
    p.length = len;
    g.parts.push(p);
  }
  add('leg', 'core', [1, -0.45, 0.58], 0.95, 1.15);
  add('leg', 'core', [1, -0.45, -0.64], 1, 1.05);
  add('eye', 'head', [0.48, 0.48, 1], 1.08, 0.9);
  add('horn', 'head', [0.75, 1, -0.25], 0.75, 0.82);
  add('tail', 'core', [0, 0.05, -1], 1, 1.15);
  add('mouth', 'head', [0, -0.32, 1], 0.8, 1, false);
  if (which === 'skitter') {
    g.name = 'Skitter';
    g.appearance = { ...g.appearance, ...PALETTES[2], pattern: 'stripes' };
    g.nodes[0].radii = [0.72, 0.55, 1.26];
    g.nodes[1].offset = [0, 0.1, 0.88];
    g.nodes[1].radii = [0.52, 0.5, 0.58];
    g.parts = [];
    add('leg', 'core', [1, -0.22, 0.85], 0.72, 1.7);
    add('leg', 'core', [1, -0.22, 0], 0.8, 1.55);
    add('leg', 'core', [1, -0.22, -0.85], 0.78, 1.6);
    add('eye', 'head', [0.48, 0.4, 1], 0.8, 1.3);
    add('fin', 'core', [0, 1, 0], 1.1, 1);
    add('mouth', 'head', [0, -0.3, 1], 0.6);
  }
  if (which === 'sprout') {
    g.name = 'Sprout';
    g.appearance = { ...g.appearance, ...PALETTES[3], pattern: 'plain' };
    g.nodes = [{ id: 'core', parent: null, offset: [0, 0, 0], radii: [0.83, 0.98, 0.8] }];
    g.parts = [];
    add('leg', 'core', [1, -0.6, 0], 1.1, 1);
    add('eye', 'core', [0.45, 0.25, 1], 1.2, 0.7);
    add('fin', 'core', [0, 1, -0.1], 1.2, 0.9);
    add('tail', 'core', [0, 0, -1], 0.65, 1);
    add('mouth', 'core', [0, -0.32, 1], 1);
  }
  return validateGenome(g);
}
export function mutate(g, seed = g.seed + 1) {
  const r = rng(seed),
    n = structuredClone(g);
  n.seed = seed >>> 0;
  n.appearance.textureSeed = seed >>> 0;
  n.generation = Math.min(999999, n.generation + 1);
  n.name = g.name;
  for (const p of n.parts) {
    p.size = clamp(p.size * (0.85 + r() * 0.3), 0.35, 2.1);
    p.length = clamp(p.length * (0.9 + r() * 0.2), 0.45, 2);
    p.twist = clamp(p.twist + (r() - 0.5) * 0.25, -Math.PI, Math.PI);
  }
  // Scale all body nodes and their offsets together; parent overlaps stay valid.
  if (n.rig?.family === 'humanoid') {
    for (const [key, { min, max }] of Object.entries(PROPORTIONS))
      n.rig.proportions[key] = clamp(n.rig.proportions[key] * (0.94 + r() * 0.12), min, max);
    syncHumanoidBody(n);
  }
  const f = 0.93 + r() * 0.14;
  if (
    n.rig?.family !== 'humanoid' &&
    n.nodes.every(
      x =>
        x.radii.every(v => v * f >= 0.25 && v * f <= 2.4) &&
        x.offset.every(v => Math.abs(v * f) <= 3),
    )
  ) {
    const before = structuredClone(n.nodes);
    for (const b of n.nodes) {
      b.radii = b.radii.map(v => v * f);
      b.offset = b.offset.map(v => v * f);
    }
    try {
      validateGenome(n);
    } catch {
      n.nodes = before;
    }
  }
  if (r() > 0.55) {
    const palette = PALETTES[Math.floor(r() * PALETTES.length)];
    n.appearance.color = palette.color;
    n.appearance.accent = palette.accent;
  }
  n.appearance.patternScale = clamp(n.appearance.patternScale + (r() - 0.5) * 1.6, 2, 12);
  return validateGenome(n);
}
export function parseGenome(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > LIMITS.fileBytes)
    throw new Error('Blueprint is too large (maximum 256 KB).');
  return validateGenome(JSON.parse(text));
}
export const serializeGenome = g => JSON.stringify(validateGenome(g), null, 2);
export const genomeFingerprint = g =>
  hash(JSON.stringify(validateGenome(g)))
    .toString(16)
    .padStart(8, '0');

export { preset, PRESET_MODELS } from './presets.js';
