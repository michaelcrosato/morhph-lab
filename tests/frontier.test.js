import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FRONTIER_MODELS, FRONTIER_PARTS, FRONTIER_KITS } from '../src/core/frontier-catalog.js';
import { FRONTIER_MOTION } from '../src/core/frontier-motion.js';
import {
  FRONTIER_PATTERNS,
  FRONTIER_MICRO,
  FRONTIER_SURFACES,
} from '../src/core/frontier-surfaces.js';
import { SHARED_PARTS } from '../src/core/shared-parts.js';
import { CATALOG } from '../src/core/catalog.js';
import { PRESET_MODELS } from '../src/core/presets.js';
import {
  preset,
  validateGenome,
  createPart,
  serializeGenome,
  parseGenome,
  mutate,
} from '../src/core/genome.js';
import { expandParts, analyze } from '../src/core/anatomy.js';
import { compileTidalPart, sampleTidalPart, placeTidalPoint } from '../src/core/tidal-geometry.js';
import { defaultMotion, sampleMotion } from '../src/core/motion.js';
import {
  defaultMixSettings,
  mixGenomes,
  createMixRecipe,
  parseMixRecipe,
} from '../src/core/mixer.js';
import { generateMicroTexture, PATTERNS, MICRO_SURFACES } from '../src/core/surfaces.js';
import { applyPartKit } from '../src/core/kits.js';
import { GenomeStore } from '../src/core/store.js';
import { actorManifest, generateActorBatch, parseActorRoster } from '../src/core/actors.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { ReviewSession, parseReviewSession } from '../src/review/session.js';
import { auditSnapshot } from '../src/review/audit.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { reviewPattern } from '../src/review/pigment.js';
const finite = x => assert.ok(Array.from(x).every(Number.isFinite));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const digest = x =>
  createHash('sha256')
    .update(Buffer.from(x.buffer, x.byteOffset, x.byteLength))
    .digest('hex');
const anim = {
  ...sampleMotion(defaultMotion('combbeat')),
  comb: 1,
  pump: 1,
  spread: 1,
  spin: 1,
  fold: 1,
  scull: 1,
  paddle: 1,
  pulse: 1,
};
function gene(type, variant = 0, mirror = false) {
  const g = preset('sprout');
  g.parts = [
    { ...createPart(g, type, 'core', [1, 0.22, 0.05], mirror), variant, size: 0.8, length: 1.15 },
  ];
  return expandParts(validateGenome(g));
}
const all = t => {
  const s = defaultMixSettings();
  for (const k in s.channels) s.channels[k] = t;
  return s;
};

test('Strange Forms adds 12 unique graphs, not color-only presets', () => {
  assert.equal(FRONTIER_MODELS.length, 12);
  assert.equal(FRONTIER_MODELS.filter(m => m.medium === 'water').length, 6);
  assert.equal(FRONTIER_MODELS.filter(m => m.medium === 'air').length, 6);
  assert.equal(PRESET_MODELS.length, 89);
  assert.equal(Object.keys(FRONTIER_PARTS).length, 12);
  assert.equal(Object.keys(SHARED_PARTS).length, 73);
  const old = new Set(
    PRESET_MODELS.filter(m => m.collection !== 'frontier').map(m =>
      JSON.stringify(preset(m.id).nodes),
    ),
  );
  const graphs = FRONTIER_MODELS.map(m => JSON.stringify(preset(m.id).nodes));
  assert.equal(new Set(graphs).size, 12);
  assert.ok(graphs.every(g => !old.has(g)));
  for (const [key, p] of Object.entries(FRONTIER_PARTS)) {
    assert.equal(CATALOG[key], p);
    assert.equal(new Set(p.variants).size, 3);
  }
});
for (const type of Object.keys(FRONTIER_PARTS))
  for (let variant = 0; variant < 3; variant++)
    test(`${type}/${variant}: finite indexed arrays, immutable rest data, seek and buffer reuse`, () => {
      const plan = compileTidalPart(gene(type, variant)[0]);
      assert.equal(plan.version, 2);
      assert.ok(plan.components.length <= 6, 'Do not emit a draw object for each hinge.');
      const hashes = plan.components.map(c => digest(c.positions)),
        a = sampleTidalPart(plan, 0.137, anim),
        saved = a.map(c => c.positions.slice());
      for (const c of a) {
        finite(c.positions);
        finite(c.normals);
        assert.equal(c.positions.length, c.normals.length);
        assert.equal(c.uvs.length, (c.positions.length / 3) * 2);
        assert.ok(c.indices.length > 0 && c.indices.every(i => i < c.positions.length / 3));
      }
      const reuse = sampleTidalPart(plan, 2.413, anim, a);
      assert.equal(a[0].positions, reuse[0].positions);
      sampleTidalPart(plan, 0.137, anim, reuse);
      a.forEach((c, i) => assert.deepEqual(c.positions, saved[i]));
      assert.deepEqual(
        plan.components.map(c => digest(c.positions)),
        hashes,
      );
      for (const c of plan.components) {
        assert.equal(c.segments[0].start, 0);
        assert.equal(
          c.segments.reduce((n, s) => n + s.count, 0),
          c.positions.length,
        );
        for (let i = 1; i < c.segments.length; i++)
          assert.equal(c.segments[i].start, c.segments[i - 1].start + c.segments[i - 1].count);
      }
    });
for (const type of Object.keys(FRONTIER_PARTS))
  test(type + ': all three shapes differ, mirrors remain mirrored, zero flex is static', () => {
    const hashes = [0, 1, 2].map(v =>
      compileTidalPart(gene(type, v)[0])
        .components.map(c => digest(c.positions))
        .join('-'),
    );
    assert.equal(new Set(hashes).size, 3);
    const pair = gene(type, 1, true);
    assert.equal(pair.length, 2);
    for (const time of [0, 0.33, 1.2]) {
      const frames = pair.map(p => sampleTidalPart(compileTidalPart(p), time, anim));
      for (let c = 0; c < frames[0].length; c++)
        for (let i = 0; i < frames[0][c].positions.length - 2; i += 153) {
          const a = placeTidalPoint(frames[0][c].positions.subarray(i, i + 3), pair[0]),
            b = placeTidalPoint(frames[1][c].positions.subarray(i, i + 3), pair[1]);
          close(a[0], -b[0]);
          close(a[1], b[1]);
          close(a[2], b[2]);
        }
    }
    const plan = compileTidalPart({ ...pair[0], flex: 0 }),
      a = sampleTidalPart(plan, 0, anim),
      b = sampleTidalPart(plan, 3, anim);
    a.forEach((c, i) => assert.deepEqual(c.positions, b[i].positions));
  });
for (const { id, medium } of FRONTIER_MODELS)
  test(
    id + ': complete inspected model, changing geometry, actor and blueprint round trips',
    () => {
      const g = preset(id, 713),
        before = serializeGenome(g),
        compiler = new FoundationCompiler(g),
        a = compiler.sample({ pose: 'motion-cycle', phase: 0.11 }),
        b = compiler.sample({ pose: 'motion-cycle', phase: 0.42 });
      assert.equal(g.motion.travel.medium, medium);
      assert.equal(a.excludedGenes, 0);
      assert.equal(b.excludedGenes, 0);
      assert.equal(a.meshes.length, b.meshes.length);
      assert.ok(a.meshes.length > 1);
      let change = 0;
      for (let i = 0; i < a.meshes.length; i++) {
        finite(a.meshes[i].positions);
        finite(a.meshes[i].normals);
        for (let j = 0; j < a.meshes[i].positions.length; j += 67)
          change += Math.abs(a.meshes[i].positions[j] - b.meshes[i].positions[j]);
      }
      assert.ok(change > 0.001);
      const report = auditSnapshot(a);
      assert.notEqual(report.technicalStatus, 'fail');
      assert.equal(report.visualStatus, 'not-reviewed');
      const render = rasterize(a, {
        width: 128,
        height: 128,
        frame: fitFrame([a, b]),
        view: 'flight',
        shading: 'pattern',
      });
      assert.equal(render.clipped, 0);
      assert.ok(render.mask.reduce((a, b) => a + b, 0) > 80);
      assert.equal(serializeGenome(g), before);
      assert.deepEqual(parseGenome(before), g);
      assert.equal(actorManifest(g).contract.travel.medium, medium);
      assert.ok(analyze(g).compatibility.locomotion.includes('chainpump'));
      const roster = generateActorBatch(g, { count: 3, seed: 172, variation: 0.55 });
      assert.deepEqual(parseActorRoster(JSON.stringify(roster)), roster);
      roster.actors.forEach(a => validateGenome(a.blueprint));
      for (const seed of [0, 123, 4294967295]) validateGenome(mutate(g, seed));
    },
  );
for (const name of FRONTIER_PATTERNS)
  test(name + ': registered CPU pigment is repeatable, bounded, and nonconstant', () => {
    assert.ok(PATTERNS.includes(name));
    let min = 1,
      max = 0;
    for (let i = 0; i < 400; i++) {
      const p = [i * 0.057, Math.sin(i) * 2, i * 0.131],
        v = reviewPattern(name, p, 0.3);
      assert.equal(v, reviewPattern(name, p, 0.3));
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    assert.ok(max - min > 0.2);
  });
for (const name of FRONTIER_MICRO)
  test(name + ': height texture is deterministic and retains alpha', () => {
    assert.ok(MICRO_SURFACES.includes(name));
    const a = generateMicroTexture(311, name, 64);
    assert.deepEqual(a, generateMicroTexture(311, name, 64));
    assert.ok(new Set(a).size > 8);
    for (let i = 3; i < a.length; i += 4) assert.equal(a[i], 255);
  });
for (const id of Object.keys(FRONTIER_MOTION))
  test(id + ': normalized clip channels and explicit humanoid compatibility', () => {
    const g = preset('comblantern');
    g.motion = defaultMotion(id);
    g.motion.travel.medium = 'water';
    const p = sampleMotion(g.motion);
    for (const [k, v] of Object.entries(p))
      if (typeof v === 'number') assert.ok(Number.isFinite(v), k);
    assert.deepEqual(sampleMotion(g.motion, { preview: false, speed: 0 }), p);
    const h = preset('wayfarer');
    h.motion = defaultMotion(id);
    assert.ok(analyze(h).warnings.some(n => n.includes(id)));
  });
for (const id of Object.keys(FRONTIER_KITS))
  test(id + ': kit append is atomic and one undo step', () => {
    const source = preset('comblantern'),
      before = serializeGenome(source),
      result = applyPartKit(source, id),
      store = new GenomeStore(source);
    store.replace(result.genome, 'Kit');
    assert.equal(store.past.length, 1);
    store.undo();
    assert.deepEqual(store.state, source);
    store.redo();
    assert.deepEqual(store.state, result.genome);
    assert.equal(serializeGenome(source), before);
    const full = structuredClone(source);
    while (full.parts.length < 32) full.parts.push(createPart(full, 'combrail'));
    const fullBefore = JSON.stringify(full);
    assert.throws(() => applyPartKit(full, id), /32/);
    assert.equal(JSON.stringify(full), fullBefore);
  });
test('new surface recipes use registered enums, and distinct microtextures', () => {
  for (const s of Object.values(FRONTIER_SURFACES)) {
    const g = preset('comblantern');
    Object.assign(g.appearance, s);
    validateGenome(g);
  }
  assert.equal(
    new Set(FRONTIER_MICRO.map(m => digest(generateMicroTexture(6, m, 64)))).size,
    FRONTIER_MICRO.length,
  );
});
test('new-old and water-air recipe mixing preserves endpoints, sources and motion locks', () => {
  for (const [aId, bId] of [
    ['comblantern', 'moonbell'],
    ['salpchain', 'hoopglider'],
    ['pleatdrake', 'wayfarer'],
    ['sievewisp', 'ribbondrift'],
  ]) {
    const a = preset(aId),
      b = preset(bId),
      before = serializeGenome(a);
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      const s = all(t),
        result = mixGenomes(a, b, s);
      validateGenome(result.genome);
      const r = createMixRecipe(a, b, s);
      assert.deepEqual(parseMixRecipe(JSON.stringify(r)), r);
    }
    const s = all(0.7);
    s.locks.motion = true;
    assert.deepEqual(mixGenomes(a, b, s, a).genome.motion, a.motion);
    assert.equal(serializeGenome(a), before);
  }
});
test('linked pump mounts stay at different nodes, not at one projected body exit', () => {
  const g = preset('salpchain'),
    parts = expandParts(g).filter(p => p.type === 'pumpbarrel');
  assert.equal(parts.length, 5);
  assert.equal(new Set(parts.map(p => p.position[2].toFixed(3))).size, 5);
  assert.ok(parts.every(p => p.variant === 2));
});
test('review records retain new sources, phase and manual decisions', () => {
  const r = new ReviewSession(preset('hoopglider'));
  r.settings.pose = 'motion-cycle';
  r.settings.phase = 0.36;
  r.notes = 'Check ring support joints.';
  assert.deepEqual(parseReviewSession(JSON.stringify(r.export())).export(), r.export());
});
test('shared public factory rejects unknown kinds, invalid variants and nonfinite time', () => {
  assert.throws(() => compileTidalPart({ type: '__proto__' }));
  assert.throws(() => compileTidalPart({ ...gene('ringwing')[0], variant: 8 }));
  assert.throws(() => sampleTidalPart(compileTidalPart(gene('ringwing')[0]), Infinity));
});

test('pump walls have outward exterior and inward interior normals', () => {
  for (const variant of [0, 1, 2]) {
    const p = { ...gene('pumpbarrel', variant)[0], flex: 0 },
      plan = compileTidalPart(p),
      outer = plan.components.find(m => m.material === 'skin'),
      inner = plan.components.find(m => m.material === 'accent');
    // The first segment is the outer/inner wall, sampled away from seams and ends.
    const i = (12 * 37 + 9) * 3;
    for (const [c, sign] of [
      [outer, 1],
      [inner, -1],
    ]) {
      const axis = variant === 2 ? 1 : 2,
        dot = c.positions[i] * c.normals[i] + c.positions[i + axis] * c.normals[i + axis];
      assert.ok(dot * sign > 0.05, `Wall normal points the wrong way: ${variant}/${sign}`);
    }
  }
});
test('a reused output buffer from another variant is resized safely', () => {
  const a = compileTidalPart(gene('combrail', 0)[0]),
    b = compileTidalPart(gene('combrail', 2)[0]);
  const output = sampleTidalPart(b, 0.4, anim, sampleTidalPart(a, 0.1, anim));
  for (let i = 0; i < output.length; i++) {
    assert.equal(output[i].positions.length, b.components[i].positions.length);
    finite(output[i].positions);
    finite(output[i].normals);
  }
});
