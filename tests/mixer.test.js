import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  preset,
  PRESET_MODELS,
  validateGenome,
  createPart,
  parseGenome,
  serializeGenome,
  LIMITS,
} from '../src/core/genome.js';
import { CATALOG } from '../src/core/catalog.js';
import {
  defaultMixSettings,
  mixGenomes,
  mixColor,
  nodePaths,
  createMixRecipe,
  parseMixRecipe,
  validateMixSettings,
} from '../src/core/mixer.js';
import { defaultMotion, sampleMotion, MOTION_CLIPS } from '../src/core/motion.js';
import {
  PATTERNS,
  MICRO_SURFACES,
  generateMicroTexture,
  appearanceLayers,
} from '../src/core/surfaces.js';
import { GenomeStore } from '../src/core/store.js';
import { MixerController } from '../src/editor/mixer-controller.js';
import { resolveNodes, expandParts, field } from '../src/core/anatomy.js';
import { compileBodySurface } from '../src/core/mesher.js';
const near = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const all = t => {
  const s = defaultMixSettings();
  for (const k in s.channels) s.channels[k] = t;
  return s;
};

test('version 1 blueprints migrate without removing anatomy', () => {
  for (const name of ['mossback', 'skitter', 'sprout']) {
    const raw = JSON.parse(
      readFileSync(new URL('./fixtures/v1-' + name + '.morph.json', import.meta.url), 'utf8'),
    );
    const g = validateGenome(raw);
    assert.equal(g.version, 6);
    assert.equal(g.parts.length, raw.parts.length);
    assert.equal(g.appearance.textureSeed, raw.appearance.textureSeed ?? raw.seed);
    assert.ok(g.motion);
  }
});
test('73 part families validate with complete default motion data', () => {
  assert.equal(Object.keys(CATALOG).length, 73);
  for (const type of Object.keys(CATALOG)) {
    const g = preset();
    g.parts = [createPart(g, type)];
    const p = validateGenome(g).parts[0];
    assert.equal(p.type, type);
    assert.equal(p.flex, 1);
    assert.equal(p.presence, 1);
  }
});
for (const p of PRESET_MODELS)
  test(p.id + ' has a canonical portable recipe', () => {
    const g = preset(p.id);
    assert.deepEqual(parseGenome(serializeGenome(g)), g);
    assert.ok(g.parts.every(p => Object.hasOwn(CATALOG, p.type)));
  });
for (const [label, edit] of [
  [
    'invalid layer pattern',
    g => (g.appearance.layers = [{ pattern: 'javascript', weight: 1, scale: 5 }]),
  ],
  [
    'excessive layers',
    g =>
      (g.appearance.layers = Array.from({ length: 4 }, () => ({
        pattern: 'plain',
        weight: 1,
        scale: 5,
      }))),
  ],
  [
    'non-finite layer weight',
    g => (g.appearance.layers = [{ pattern: 'spots', weight: NaN, scale: 5 }]),
  ],
  ['fractional variant', g => (g.parts[0].variant = 0.5)],
  ['negative flex', g => (g.parts[0].flex = -1)],
  ['excessive presence', g => (g.parts[0].presence = 1.1)],
  ['negative motion weight', g => (g.motion.weights.walk = -1)],
  ['non-finite tempo', g => (g.motion.tempo = NaN)],
  ['invalid micro surface', g => (g.appearance.micro = 'unknown')],
  ['fractional texture seed', g => (g.appearance.textureSeed = 1.5)],
])
  test('new schema rejects ' + label, () => {
    const g = preset();
    edit(g);
    assert.throws(() => validateGenome(g));
  });
test('motion and layer unknown fields do not survive validation', () => {
  const g = preset();
  g.motion.executable = 'x';
  g.motion.weights.inject = 1;
  g.appearance.layers = [{ pattern: 'spots', weight: 0.4, scale: 5, script: 'x' }];
  const v = validateGenome(g);
  assert.equal(v.motion.executable, undefined);
  assert.equal(v.motion.weights.inject, undefined);
  assert.equal(v.appearance.layers[0].script, undefined);
});
test(`all ${PRESET_MODELS.length ** 2} source pairs validate at five mix points (${PRESET_MODELS.length ** 2 * 5} blends)`, () => {
  for (const pa of PRESET_MODELS)
    for (const pb of PRESET_MODELS)
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const result = mixGenomes(preset(pa.id), preset(pb.id), all(t));
        assert.deepEqual(validateGenome(result.genome), result.genome);
      }
});
test('source recipes remain immutable through preview and seeded variation', () => {
  const a = preset('carapace'),
    b = preset('glider'),
    beforeA = structuredClone(a),
    beforeB = structuredClone(b),
    s = all(0.4);
  s.mutation = 0.7;
  mixGenomes(a, b, s);
  assert.deepEqual(a, beforeA);
  assert.deepEqual(b, beforeB);
});
test('source endpoints preserve shape, attachment, surface, and motion content', () => {
  const a = preset('tendril'),
    b = preset('grazer');
  for (const [t, source] of [
    [0, a],
    [1, b],
  ]) {
    const g = mixGenomes(a, b, all(t)).genome;
    for (const k of ['nodes', 'parts', 'appearance', 'motion']) assert.deepEqual(g[k], source[k]);
  }
});
test('pigment alone can be mixed without changing body, parts, or motion', () => {
  const a = preset(),
    b = preset('glider'),
    s = all(0);
  s.channels.pigment = 1;
  const g = mixGenomes(a, b, s).genome;
  assert.deepEqual(g.nodes, a.nodes);
  assert.deepEqual(g.parts, a.parts);
  assert.deepEqual(g.motion, a.motion);
  assert.equal(g.appearance.color, b.appearance.color);
});
test('body and texture locks retain frozen geometry and the texture seed', () => {
  const a = preset(),
    b = preset('glider'),
    frozen = preset('tendril', 888),
    s = all(0.8);
  s.locks.body = s.locks.surface = true;
  s.mutation = 1;
  s.seed = 2242;
  const g = mixGenomes(a, b, s, frozen).genome;
  assert.deepEqual(g.nodes, frozen.nodes);
  assert.equal(g.appearance.textureSeed, 888);
  assert.deepEqual(g.appearance.layers, frozen.appearance.layers);
});
test('all locked channels preserve frozen content except remapped metadata', () => {
  const a = preset(),
    b = preset('glider'),
    f = preset('burrower');
  const s = all(0.3);
  for (const k in s.locks) s.locks[k] = true;
  s.mutation = 1;
  const g = mixGenomes(a, b, s, f).genome;
  for (const k of ['nodes', 'parts', 'appearance', 'motion']) assert.deepEqual(g[k], f[k]);
});
test('explicit graph selection is independent of the body blend amount', () => {
  const a = preset('sprout'),
    b = preset('glider'),
    s = all(0.2);
  s.topology = 'b';
  const g = mixGenomes(a, b, s).genome;
  assert.equal(g.nodes.length, 2);
  s.topology = 'a';
  assert.equal(mixGenomes(a, b, s).genome.nodes.length, 1);
});
test('unmatched parts have smooth nonzero presence values', () => {
  const a = preset(),
    b = preset('glider'),
    g = mixGenomes(a, b, all(0.25)).genome;
  near(g.parts.find(p => p.type === 'wing').presence, 0.25);
  near(g.parts.find(p => p.type === 'horn').presence, 0.75);
});
test('zero-presence genes generate no runtime structures', () => {
  const g = preset();
  const id = g.parts[0].id;
  g.parts[0].presence = 0;
  assert.equal(expandParts(g).filter(p => p.id === id).length, 0);
});
test('opposed anchors interpolate without zero or NaN directions', () => {
  const a = preset(),
    b = structuredClone(a);
  a.parts[0].anchor = [0, 0, 1];
  b.parts[0].anchor = [0, 0, -1];
  for (const t of [0.25, 0.5, 0.75]) {
    const p = mixGenomes(a, b, all(t)).genome.parts[0];
    near(Math.hypot(...p.anchor), 1);
    assert.ok(p.anchor.every(Number.isFinite));
  }
});
test('parts reattach to an ancestor when their source host is absent', () => {
  const a = preset('glider'),
    b = preset('sprout'),
    s = all(0.5);
  s.topology = 'b';
  const g = mixGenomes(a, b, s).genome;
  assert.ok(g.parts.every(p => p.host === 'core'));
});
test('global ID collisions are repaired safely', () => {
  const a = preset(),
    b = preset();
  b.nodes[1].id = 'mix-part-1';
  for (const p of b.parts) if (p.host === 'head') p.host = 'mix-part-1';
  const g = mixGenomes(a, b, all(0.6)).genome;
  const ids = [...g.nodes, ...g.parts].map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
});
test('mixing two dense inputs respects the 32-gene work bound', () => {
  const a = preset(),
    b = preset();
  for (const [g, type] of [
    [a, 'horn'],
    [b, 'antenna'],
  ]) {
    g.parts = [];
    for (let i = 0; i < 32; i++) g.parts.push(createPart(g, type));
  }
  const result = mixGenomes(a, b, all(0.5));
  assert.equal(result.genome.parts.length, LIMITS.parts);
  assert.ok(result.notes.some(n => n.includes('32')));
});
test('layer overflow retains four strongest layers and reports the reduction', () => {
  const a = preset(),
    b = preset('glider');
  a.appearance.pattern = 'plain';
  b.appearance.pattern = 'cracks';
  for (let i = 1; i <= 3; i++) {
    a.appearance.layers.push({ pattern: PATTERNS[i], weight: 0.5, scale: 4, angle: 0, warp: 0.4 });
    b.appearance.layers.push({
      pattern: PATTERNS[i + 3],
      weight: 0.5,
      scale: 6,
      angle: 0,
      warp: 0.6,
    });
  }
  const result = mixGenomes(a, b, all(0.5));
  assert.equal(appearanceLayers(result.genome.appearance).length, 4);
  assert.ok(result.notes.some(n => n.includes('four strongest')));
});
test('texture layers preserve zero weight at zero and one weight at one', () => {
  const a = preset(),
    b = preset('glider');
  a.appearance.weight = 0;
  assert.equal(mixGenomes(a, b, all(0)).genome.appearance.weight, 0);
  assert.equal(mixGenomes(a, b, all(1)).genome.appearance.weight, 1);
});
test('node paths are stable when source arrays are reordered', () => {
  const a = preset(),
    b = structuredClone(a);
  b.nodes.reverse();
  assert.deepEqual([...nodePaths(a)], [...nodePaths(b)]);
});
test('mixed attachments stay on the regenerated skin', () => {
  const g = mixGenomes(preset('glider'), preset('tendril'), all(0.4)).genome,
    nodes = resolveNodes(g);
  for (const p of expandParts(g, nodes)) assert.ok(Math.abs(field(p.position, nodes)) < 1e-5);
});
test('hybrid body compiler still emits finite indexed geometry', () => {
  for (const t of [0.25, 0.5, 0.75]) {
    const g = mixGenomes(preset('grazer'), preset('thornling'), all(t)).genome,
      data = compileBodySurface(resolveNodes(g));
    assert.ok(data.positions.every(Number.isFinite));
    assert.ok(data.indices.length > 300);
  }
});
test('same mixer seed reproduces mutation; a new seed changes it', () => {
  const a = preset(),
    b = preset('glider'),
    s = all(0.4);
  s.mutation = 0.7;
  const x = mixGenomes(a, b, s);
  assert.deepEqual(x, mixGenomes(a, b, s));
  s.seed++;
  assert.notDeepEqual(x.genome, mixGenomes(a, b, s).genome);
});
test('linear-light color blending preserves endpoints', () => {
  assert.equal(mixColor('#123456', '#abcdef', 0), '#123456');
  assert.equal(mixColor('#123456', '#abcdef', 1), '#abcdef');
  assert.equal(mixColor('#000000', '#ffffff', 0.5), '#bcbcbc');
});
test('a portable mix recipe reproduces the same hybrid after JSON round trip', () => {
  const a = preset('carapace'),
    b = preset('glider'),
    s = all(0.37);
  s.mutation = 0.4;
  const recipe = parseMixRecipe(JSON.stringify(createMixRecipe(a, b, s)));
  assert.deepEqual(
    mixGenomes(a, b, s),
    mixGenomes(recipe.sources.a, recipe.sources.b, recipe.settings, recipe.frozen),
  );
});
test('invalid and excessive recipe data is rejected', () => {
  assert.throws(() => parseMixRecipe('{'));
  assert.throws(() => parseMixRecipe(' '.repeat(1048577)));
  assert.throws(() => parseMixRecipe('{"format":"morph-lab-mixer","version":99}'));
  for (const edit of [
    s => (s.channels.body = NaN),
    s => (s.locks.body = 1),
    s => (s.topology = 'unknown'),
    s => (s.seed = -1),
    s => (s.seed = 2.5),
    s => (s.mutation = 2),
  ]) {
    const s = defaultMixSettings();
    edit(s);
    assert.throws(() => validateMixSettings(s));
  }
});
test('mixer preview/cancel has no history side effects', () => {
  const store = new GenomeStore(preset()),
    m = new MixerController(store),
    before = store.state;
  for (let i = 0; i < 20; i++) {
    m.master(i / 20);
    m.preview();
  }
  assert.equal(store.past.length, 0);
  m.cancel();
  assert.deepEqual(store.state, before);
  assert.equal(store.past.length, 0);
});
test('mixer commit is one reversible history transaction', () => {
  const store = new GenomeStore(preset()),
    m = new MixerController(store),
    before = store.state;
  for (let i = 0; i < 30; i++) {
    m.master(i / 30);
    m.preview();
  }
  const after = store.state;
  m.commit();
  assert.equal(store.past.length, 1);
  store.undo();
  assert.deepEqual(store.state, before);
  store.redo();
  assert.deepEqual(store.state, after);
});
test('captured source data has independent ownership', () => {
  const store = new GenomeStore(preset()),
    m = new MixerController(store);
  m.setSource('a', 'snapshot');
  const state = m.state;
  state.sources.a.name = 'Not stored';
  store.change('Rename', g => {
    g.name = 'Changed';
  });
  assert.equal(m.sources.a.name, 'Mossback');
});
test('randomize leaves locked channel values unchanged', () => {
  const m = new MixerController(new GenomeStore(preset()));
  m.settings.locks.body = true;
  const before = m.settings.channels.body;
  m.randomize();
  assert.equal(m.settings.channels.body, before);
  assert.notEqual(m.settings.channels.parts, 0.5);
});
test('invalid recipe imports do not partially replace controller sources', () => {
  const m = new MixerController(new GenomeStore(preset())),
    before = m.state;
  assert.throws(() => m.importRecipe('{"format":"wrong"}'));
  assert.deepEqual(m.state, before);
});
test('motion blends are normalized and finite for all 37 states', () => {
  assert.equal(Object.keys(MOTION_CLIPS).length, 37);
  const m = defaultMotion();
  for (const k in m.weights) m.weights[k] = 1;
  const pose = sampleMotion(m);
  assert.ok(
    Object.values(pose)
      .filter(x => typeof x === 'number')
      .every(Number.isFinite),
  );
  const expected =
    Object.values(MOTION_CLIPS).reduce((s, c) => s + c.rate, 0) / Object.keys(MOTION_CLIPS).length;
  near(pose.rate, expected);
});
test('all-zero motion weights fall back to idle', () => {
  const m = defaultMotion();
  for (const k in m.weights) m.weights[k] = 0;
  const p = sampleMotion(m);
  assert.equal(p.rate, 0);
  assert.equal(p.stride, 0);
});
test('secondary gains do not change normalized state weights', () => {
  const a = defaultMotion('walk'),
    b = structuredClone(a);
  b.layers.blink = 0;
  b.layers.breath = 2;
  const pa = sampleMotion(a),
    pb = sampleMotion(b);
  assert.equal(pa.rate, pb.rate);
  assert.equal(pb.layers.blink, 0);
});
test('habitat movement adds a gait but resting input does not walk in place', () => {
  const m = defaultMotion();
  assert.ok(sampleMotion(m, { speed: 3, preview: false }).rate > 0);
  assert.equal(sampleMotion(defaultMotion('run'), { speed: 0, preview: false }).rate, 0);
});
test('motion tempo, stride, and lift scales are independent', () => {
  const m = defaultMotion('walk');
  m.tempo = 2;
  m.stride = 1.5;
  m.lift = 0.5;
  const p = sampleMotion(m);
  near(p.rate, 2.1);
  near(p.stride, 0.93);
  near(p.lift, 0.13);
});
for (const style of MICRO_SURFACES)
  test(style + ' microtexture is repeatable and RGBA bounded', () => {
    const a = generateMicroTexture(24, style, 32),
      b = generateMicroTexture(24, style, 32);
    assert.equal(a.length, 4096);
    assert.deepEqual(a, b);
    for (let i = 3; i < a.length; i += 4) assert.equal(a[i], 255);
  });
test('microtexture styles differ and reject invalid allocation sizes', () => {
  assert.notDeepEqual(generateMicroTexture(1, 'scales'), generateMicroTexture(1, 'ridges'));
  assert.throws(() => generateMicroTexture(1, 'unknown'));
  assert.throws(() => generateMicroTexture(1, 'pores', 4096));
});

test('motion and mixer reject malformed channel containers', () => {
  for (const value of [null, [], 3, 'invalid']) {
    const g = preset();
    g.motion.weights = value;
    assert.throws(() => validateGenome(g));
    const h = preset();
    h.motion.layers = value;
    assert.throws(() => validateGenome(h));
    assert.throws(() => validateMixSettings({ channels: value }));
    assert.throws(() => validateMixSettings({ locks: value }));
  }
});

test('v9 mixer saves do not overwrite the previous slot and can load it', () => {
  const original = globalThis.localStorage,
    items = new Map();
  globalThis.localStorage = {
    getItem: key => items.get(key) || null,
    setItem: (key, value) => items.set(key, value),
  };
  try {
    const m = new MixerController(new GenomeStore(preset('warden')));
    const legacy = JSON.stringify(m.recipe());
    items.set('morph-lab.mixer.v4', legacy);
    m.setSource('a', 'grovekeeper');
    m.save();
    assert.equal(items.get('morph-lab.mixer.v4'), legacy);
    assert.ok(items.has('morph-lab.mixer.v9'));
    const restored = new MixerController(new GenomeStore(preset()));
    restored.load();
    assert.equal(restored.sources.a.name, 'Grovekeeper');
    items.delete('morph-lab.mixer.v9');
    restored.load();
    assert.equal(restored.sources.a.name, 'Warden');
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
