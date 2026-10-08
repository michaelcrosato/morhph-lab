import test from 'node:test';
import assert from 'node:assert/strict';
import { preset, validateGenome, PRESET_MODELS } from '../src/core/genome.js';
import {
  TRAITS,
  SCOPES,
  CREATOR_MODELS,
  generateDiscovery,
  generateBatch,
  mixDiscovery,
  replayRecipe,
  defaultLocks,
  defaultChannels,
  partTrait,
  eligibleModels,
  checkedSeed,
  checkedTraits,
} from '../src/creator/generator.js';
import { CreatorSession } from '../src/creator/session.js';
import { DiscoveryLibrary, parseCollection, LIBRARY_KEY } from '../src/creator/library.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { rasterize } from '../src/review/raster.js';
import { fitCreatorFrame } from '../src/creator/camera.js';
const clone = structuredClone,
  a = preset('mossback'),
  b = preset('moonbell');
const store = () => {
  const data = new Map();
  return { data, getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v) };
};
const solid = g => ({ nodes: g.nodes, rig: g.rig, parts: g.parts, seed: g.seed });
const surface = g =>
  Object.fromEntries(
    Object.entries(g.appearance).filter(([k]) => !['color', 'accent'].includes(k)),
  );
const sameParts = (g, source, group) =>
  assert.deepEqual(
    g.parts.filter(p => partTrait(p) === group),
    source.parts.filter(p => partTrait(p) === group),
  );
const roll = (g = a, seed = 51) => generateDiscovery(g, { kind: 'variation', seed });

test('Creator catalog retains every existing preset and hydrated travel metadata', () => {
  assert.equal(CREATOR_MODELS.length, 89);
  assert.deepEqual(
    CREATOR_MODELS.map(m => m.id),
    PRESET_MODELS.map(m => m.id),
  );
  for (const m of CREATOR_MODELS) {
    const g = preset(m.id);
    assert.equal(m.medium, g.motion.travel.medium);
    assert.equal(m.family, g.rig.family);
  }
});
for (const scope of Object.keys(SCOPES))
  test('Random source pool: ' + scope, () => {
    const before = clone(a);
    for (const seed of [0, 1, 51, 4294967295]) {
      const first = generateDiscovery(a, { scope, seed }),
        second = generateDiscovery(a, { scope, seed });
      assert.deepEqual(first, second);
      assert.deepEqual(replayRecipe(first.recipe).genome, first.genome);
      assert.deepEqual(validateGenome(first.genome), first.genome);
      const g = first.genome;
      if (scope === 'humanoid') assert.equal(g.rig.family, 'humanoid');
      else if (scope !== 'all') {
        assert.equal(g.rig.family, 'creature');
        if (scope !== 'creatures') assert.equal(g.motion.travel.medium, scope);
      }
    }
    assert.deepEqual(a, before);
    assert.ok(eligibleModels(scope).length);
  });
for (const type of ['mossback', 'wayfarer', 'archivist', 'moonbell', 'glassdart', 'salpchain'])
  test('Variation replay and immutable source: ' + type, () => {
    const source = preset(type),
      saved = clone(source);
    for (const strength of [0, 0.01, 0.35, 1]) {
      const r = generateDiscovery(source, { kind: 'variation', strength, seed: 2147483648 });
      assert.deepEqual(replayRecipe(r.recipe).genome, r.genome);
      assert.equal(r.genome.rig.family, source.rig.family);
      assert.equal(r.genome.motion.travel.medium, source.motion.travel.medium);
      if (strength === 0) assert.deepEqual(r.genome, source);
    }
    assert.deepEqual(source, saved);
  });
for (const type of ['mossback', 'wayfarer', 'moonbell'])
  for (const trait of Object.keys(TRAITS))
    test('Isolated ' + trait + ' roll on ' + type, () => {
      const source = preset(type),
        r = generateDiscovery(source, { kind: 'trait', trait, seed: 15243 }),
        g = r.genome;
      assert.deepEqual(replayRecipe(r.recipe).genome, g);
      if (trait !== 'body') {
        assert.deepEqual(g.nodes, source.nodes);
        assert.deepEqual(g.rig, source.rig);
      }
      if (trait !== 'head') sameParts(g, source, 'head');
      if (trait !== 'parts') sameParts(g, source, 'parts');
      if (trait !== 'pigment') {
        assert.equal(g.appearance.color, source.appearance.color);
        assert.equal(g.appearance.accent, source.appearance.accent);
      }
      if (trait !== 'surface') assert.deepEqual(surface(g), surface(source));
      if (trait !== 'motion') assert.deepEqual(g.motion, source.motion);
      assert.equal(g.seed, source.seed);
    });
for (const locked of Object.keys(TRAITS))
  test('Locked ' + locked + ' survives mixed rigs and randomization', () => {
    const l = { ...defaultLocks(), [locked]: true };
    for (const g of [
      generateDiscovery(a, { seed: 56, scope: 'humanoid', locks: l }).genome,
      mixDiscovery(a, preset('ogre'), { seed: 76, locks: l }, a).genome,
    ]) {
      if (locked === 'body' || locked === 'head' || locked === 'parts') {
        assert.deepEqual(g.nodes, a.nodes);
        assert.deepEqual(g.rig, a.rig);
        assert.equal(g.seed, a.seed);
      }
      if (locked === 'head' || locked === 'parts') sameParts(g, a, locked);
      if (locked === 'surface') assert.deepEqual(surface(g), surface(a));
      if (locked === 'pigment') {
        assert.equal(g.appearance.color, a.appearance.color);
        assert.equal(g.appearance.accent, a.appearance.accent);
      }
      if (locked === 'motion') assert.deepEqual(g.motion, a.motion);
    }
  });
test('All traits locked retain all source features', () => {
  const locks = Object.fromEntries(Object.keys(TRAITS).map(k => [k, true])),
    g = generateDiscovery(a, { seed: 933, locks }).genome;
  assert.deepEqual(solid(g), solid(a));
  assert.deepEqual(g.appearance, a.appearance);
  assert.deepEqual(g.motion, a.motion);
});
test('Six variations come from the same frozen source and distinct seeds', () => {
  const before = clone(a),
    batch = generateBatch(a, { seed: 7 });
  assert.equal(batch.length, 6);
  assert.equal(new Set(batch.map(r => r.recipe.seed)).size, 6);
  assert.equal(new Set(batch.map(r => JSON.stringify(r.genome))).size, 6);
  for (const r of batch) {
    assert.deepEqual(r.recipe.frozen, before);
    assert.deepEqual(replayRecipe(r.recipe).genome, r.genome);
  }
  assert.deepEqual(a, before);
  assert.deepEqual(generateBatch(a, { seed: 7 }), batch);
});
test('Recipe detects altered geometry, sources, channels and versions', () => {
  const result = roll();
  for (const edit of [
    r => (r.result.nodes[0].radii[0] *= 1.01),
    r => (r.sources.a.nodes[0].radii[0] *= 1.01),
    r => (r.channels.body = 0.8),
    r => (r.version = 99),
  ]) {
    const r = clone(result.recipe);
    edit(r);
    assert.throws(() => replayRecipe(r));
  }
});
test('Validation rejects invalid seeds, traits, scopes and batch sizes', () => {
  for (const seed of [-1, 1.5, 4294967296, NaN, Infinity, '1', null])
    assert.throws(() => checkedSeed(seed));
  for (const v of [null, [], 4]) assert.throws(() => checkedTraits(v));
  assert.throws(() => checkedTraits({ body: '1' }));
  assert.throws(() => checkedTraits({ body: 1 }, true));
  assert.throws(() => generateDiscovery(a, { scope: 'unknown' }));
  assert.throws(() => generateDiscovery(a, { trait: 'unknown', kind: 'trait' }));
  assert.throws(() => generateDiscovery(a, { kind: 'other' }));
  for (const count of [0, 7, 1.5]) assert.throws(() => generateBatch(a, {}, count));
});

test('Preview recomputes from fixed parent and keeps one undo step', () => {
  const s = new CreatorSession(a),
    base = clone(s.current);
  for (const weight of [0.2, 0.8, 0.4])
    s.preview(
      mixDiscovery(s.sources.a, s.sources.b, { channels: defaultChannels(weight) }, base.genome),
    );
  assert.equal(s.past.length, 0);
  assert.deepEqual(s.previewBase, base);
  const result = clone(s.current);
  s.apply();
  assert.equal(s.past.length, 1);
  s.undo();
  assert.deepEqual(s.current, base);
  s.redo();
  assert.deepEqual(s.current, result);
});
test('Undo in preview cancels it without also undoing the previous committed change', () => {
  const s = new CreatorSession(a);
  s.commit(roll());
  const base = clone(s.current);
  s.preview(mixDiscovery(a, b));
  s.undo();
  assert.deepEqual(s.current, base);
  assert.equal(s.past.length, 1);
  assert.equal(s.previewBase, null);
});
test('Invalid commit cannot apply a pending preview', () => {
  const s = new CreatorSession();
  s.preview(mixDiscovery(a, b));
  const before = clone(s);
  assert.throws(() => s.commit({ name: 'bad' }));
  assert.deepEqual(clone(s), before);
});
test('Rename keeps replayable provenance and is undoable', () => {
  const s = new CreatorSession(a);
  s.commit(roll());
  const before = clone(s.current);
  s.rename('Keeper one');
  assert.equal(s.current.genome.name, 'Keeper one');
  assert.deepEqual(replayRecipe(s.current.recipe).genome, s.current.genome);
  s.undo();
  assert.deepEqual(s.current, before);
});
test('Setting parent clones the blueprint and does not alter saved source', () => {
  const s = new CreatorSession(a),
    source = clone(b);
  s.parent('a', source);
  source.name = 'Not the parent';
  assert.equal(s.sources.a.name, b.name);
  s.current.genome.name = 'Not parent either';
  assert.equal(s.sources.a.name, b.name);
  assert.throws(() => s.parent('c', a));
});
test('Session export and restore retain parents, channels and current recipe', () => {
  const s = new CreatorSession(a);
  s.commit(roll());
  s.settings.channels.head = 0.77;
  s.settings.locks.motion = true;
  s.parent('b', preset('fiend'));
  const document = s.export();
  assert.deepEqual(CreatorSession.restore(document).export(), document);
  document.current.genome.name = 'External edit';
  assert.notEqual(document.current.genome.name, s.current.genome.name);
});
test('History remains bounded; branching clears redo', () => {
  const s = new CreatorSession(a);
  for (let i = 0; i < 45; i++) s.rename('Name ' + i);
  assert.equal(s.past.length, 40);
  s.undo();
  assert.equal(s.future.length, 1);
  s.rename('New branch');
  assert.equal(s.future.length, 0);
});

test('Library persists full independent blueprints and replayable recipes', () => {
  const disk = store(),
    lib = new DiscoveryLibrary(disk),
    r = roll(),
    saved = lib.save(r);
  r.genome.name = 'Outside';
  assert.equal(lib.items.length, 1);
  assert.notEqual(lib.get(saved.item.id).genome.name, 'Outside');
  const loaded = new DiscoveryLibrary(disk);
  assert.deepEqual(loaded.export(), lib.export());
  assert.deepEqual(replayRecipe(loaded.items[0].recipe).genome, loaded.items[0].genome);
});
test('Exact duplicates do not grow the collection; favorite toggles persist', () => {
  const lib = new DiscoveryLibrary(store());
  const first = lib.save(a),
    second = lib.save(a);
  assert.equal(second.duplicate, true);
  assert.equal(second.item.id, first.item.id);
  assert.equal(lib.items.length, 1);
  lib.favorite(first.item.id);
  assert.equal(lib.get(first.item.id).favorite, true);
  lib.favorite(first.item.id);
  assert.equal(lib.get(first.item.id).favorite, false);
});
test('Import merges without replacing existing discoveries and handles ID collisions', () => {
  const lib = new DiscoveryLibrary(store()),
    other = new DiscoveryLibrary();
  const first = lib.save(a);
  other.save(b);
  const incoming = other.export();
  incoming.items[0].id = first.item.id;
  assert.equal(lib.merge(JSON.stringify(incoming)), 1);
  assert.equal(new Set(lib.items.map(i => i.id)).size, 2);
  assert.deepEqual(lib.items[0].genome, a);
  assert.equal(lib.merge(JSON.stringify(incoming)), 0);
});
test('Invalid collection import is atomic', () => {
  const lib = new DiscoveryLibrary(store());
  lib.save(a);
  const before = lib.export(),
    doc = clone(before);
  doc.items.push({ ...clone(doc.items[0]), id: 'd-bad', genome: { name: 'Bad' } });
  assert.throws(() => lib.merge(JSON.stringify(doc)));
  assert.deepEqual(lib.export(), before);
});
test('Full collection refuses additions without deleting an old item', () => {
  const lib = new DiscoveryLibrary(store());
  for (let i = 0; i < 48; i++) lib.save({ ...clone(a), name: 'Kept ' + i });
  const before = lib.export();
  assert.throws(() => lib.save(b), /48/);
  assert.deepEqual(lib.export(), before);
  const other = new DiscoveryLibrary();
  other.save(b);
  assert.throws(() => lib.merge(JSON.stringify(other.export())), /48/);
  assert.deepEqual(lib.export(), before);
});
test('Corrupt browser save is protected from overwrite', () => {
  const disk = store();
  disk.setItem(LIBRARY_KEY, 'broken{');
  const lib = new DiscoveryLibrary(disk);
  assert.equal(lib.protectedStorage, true);
  const kept = lib.save(a);
  assert.equal(kept.persistent, false);
  assert.equal(lib.items.length, 1);
  assert.equal(disk.getItem(LIBRARY_KEY), 'broken{');
  assert.match(lib.warning, /not overwritten/);
});
test('Storage quota or permission failure retains the in-memory collection', () => {
  const disk = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    },
    lib = new DiscoveryLibrary(disk);
  lib.save(a);
  assert.equal(lib.items.length, 1);
  assert.equal(lib.persistent, false);
  assert.match(lib.warning, /Export a backup/);
  assert.equal(parseCollection(JSON.stringify(lib.export())).length, 1);
});
test('Library reads and exports are detached copies', () => {
  const lib = new DiscoveryLibrary();
  const saved = lib.save(a);
  saved.item.genome.name = 'external';
  const got = lib.get(saved.item.id);
  got.genome.name = 'also external';
  const doc = lib.export();
  doc.items = [];
  assert.deepEqual(lib.get(saved.item.id).genome, a);
});
test('Removal affects collection only', () => {
  const lib = new DiscoveryLibrary(),
    session = new CreatorSession(a),
    kept = lib.save(a);
  session.parent('a', kept.item.genome);
  lib.remove(kept.item.id);
  assert.equal(lib.items.length, 0);
  assert.deepEqual(session.sources.a, a);
  assert.deepEqual(session.current.genome, a);
  assert.throws(() => lib.remove(kept.item.id));
});
test('Collection parser rejects duplicate IDs, mismatched recipes and executable IDs', () => {
  const lib = new DiscoveryLibrary();
  lib.save(roll());
  const original = lib.export();
  for (const change of [
    d => d.items.push(clone(d.items[0])),
    d => (d.items[0].genome.nodes[0].radii[0] *= 1.1),
    d => (d.items[0].id = '\" onclick=\"bad()'),
    d => (d.version = 99),
  ]) {
    const d = clone(original);
    change(d);
    assert.throws(() => parseCollection(JSON.stringify(d)));
  }
});

for (const id of ['mossback', 'moonbell', 'glassdart', 'wayfarer', 'archivist', 'salpchain'])
  test('Actual generated discovery geometry renders: ' + id, () => {
    const r = roll(preset(id), 22),
      compiler = new FoundationCompiler(r.genome),
      snap = compiler.sample({ pose: 'motion-cycle', phase: 0.25 });
    assert.ok(snap.meshes.length > 0);
    const frame = fitCreatorFrame([snap], 384, 260, 'quarter'),
      image = rasterize(snap, { width: 384, height: 260, view: 'quarter', frame, shading: 'clay' });
    assert.ok(image.mask.reduce((x, y) => x + y, 0) > 600);
    assert.equal(image.clipped, 0);
  });
test('Every existing source supports variation and a mixed result within gene limits', () => {
  for (const model of CREATOR_MODELS) {
    const source = preset(model.id);
    for (const strength of [0.15, 0.75]) {
      const r = generateDiscovery(source, {
        kind: 'variation',
        seed: 0xfab310 + model.id.length,
        strength,
      });
      assert.ok(r.genome.parts.length <= 32);
      assert.deepEqual(replayRecipe(r.recipe).genome, r.genome);
    }
  }
});

test('A body-only roll refuses an explicit attachment lock', () => {
  assert.throws(
    () =>
      generateDiscovery(a, {
        kind: 'trait',
        trait: 'body',
        locks: { ...defaultLocks(), head: true },
      }),
    /Unlock/,
  );
});
