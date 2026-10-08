import test from 'node:test';
import assert from 'node:assert/strict';
import {
  preset,
  validateGenome,
  mutate,
  parseGenome,
  serializeGenome,
  removeGene,
  createPart,
  nextId,
  LIMITS,
  genomeFingerprint,
} from '../src/core/genome.js';
import { GenomeStore } from '../src/core/store.js';
import {
  analyze,
  resolveNodes,
  field,
  fieldNormal,
  expandParts,
  projectAnchor,
} from '../src/core/anatomy.js';
import { solveTwoBone } from '../src/core/ik.js';
import { rng, distance, normalize, normalToAngles, anglesToNormal } from '../src/core/math.js';
import { makeLevel } from '../src/core/level.js';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../src/core/version.js';
const approx = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} differs from ${b}`);

test('all three foundational blueprints validate and have intended limb counts', () => {
  for (const [name, limbs] of [
    ['mossback', 4],
    ['skitter', 6],
    ['sprout', 2],
  ]) {
    const g = preset(name);
    assert.deepEqual(validateGenome(g), g);
    assert.equal(analyze(g).legs, limbs);
  }
});
test('JSON export/import is a stable canonical round trip', () => {
  const g = preset();
  assert.deepEqual(parseGenome(serializeGenome(g)), g);
  assert.equal(genomeFingerprint(g), genomeFingerprint(parseGenome(serializeGenome(g))));
});
test('validation whitelists fields and normalizes radial anchors', () => {
  const g = preset();
  g.evil = { script: 'not executable' };
  g.parts[0].junk = 'x';
  g.parts[0].anchor = [1, 0.1, 0.1];
  const result = validateGenome(g);
  assert.equal(result.evil, undefined);
  assert.equal(result.parts[0].junk, undefined);
  approx(Math.hypot(...result.parts[0].anchor), 1);
});
for (const [label, edit, pattern] of [
  ['unsupported version', g => (g.version = 99), /version/],
  ['duplicate IDs', g => (g.nodes[1].id = g.nodes[0].id), /duplicate/],
  ['missing attachment host', g => (g.parts[0].host = 'missing'), /missing body/],
  ['unknown appendage type', g => (g.parts[0].type = 'constructor'), /unknown part/],
  ['invalid numbers', g => (g.parts[0].size = NaN), /part size/],
  ['out of bounds size', g => (g.parts[0].size = 100), /part size/],
  ['unsafe colors', g => (g.appearance.color = 'url(https://example.com)'), /colors/],
  ['zero anchor', g => (g.parts[0].anchor = [0, 0, 0]), /anchor cannot/],
  ['missing parent', g => (g.nodes[1].parent = 'gone'), /missing parent/],
  ['self cycle', g => (g.nodes[1].parent = 'head'), /cycle/],
  ['second root', g => (g.nodes[1].parent = null), /exactly one root/],
  ['floating segment', g => (g.nodes[1].offset = [0, 0, 3]), /overlap/],
  [
    'excessive gene count',
    g => {
      g.parts = Array.from({ length: LIMITS.parts + 1 }, (_, i) => ({
        ...g.parts[0],
        id: 'p' + i,
      }));
    },
    /at most/,
  ],
  ['fractional seed', g => (g.seed = 0.2), /integer/],
  ['fractional generation', g => (g.generation = 0.3), /integer/],
])
  test('rejects ' + label, () => {
    const g = preset();
    edit(g);
    assert.throws(() => validateGenome(g), pattern);
  });
test('rejects malformed and excessive JSON before use', () => {
  assert.throws(() => parseGenome('{'));
  assert.throws(() => parseGenome(' '.repeat(LIMITS.fileBytes + 1)), /too large/);
  assert.throws(() => parseGenome('🌱'.repeat(70000)), /too large/);
});
test('hierarchy resolution is independent of input node order', () => {
  const g = preset(),
    a = resolveNodes(g);
  g.nodes.reverse();
  const b = resolveNodes(validateGenome(g));
  assert.deepEqual(a.find(n => n.id === 'head').center, b.find(n => n.id === 'head').center);
});
test('deletion cascades through descendant bodies and their attachments', () => {
  const g = preset();
  g.nodes.push({ id: 'child', parent: 'head', offset: [0, 0, 0.3], radii: [0.4, 0.4, 0.4] });
  g.parts.push(createPart(g, 'fin', 'child'));
  const count = g.parts.filter(p => p.host === 'core').length;
  removeGene(g, 'head');
  assert.deepEqual(
    g.nodes.map(n => n.id),
    ['core'],
  );
  assert.equal(g.parts.length, count);
  validateGenome(g);
});
test('deleting the root is forbidden', () => {
  assert.throws(() => removeGene(preset(), 'core'), /root/);
});
test('identifiers remain unique after removal and addition', () => {
  const g = preset();
  const id = nextId(g);
  assert.ok(!g.parts.some(p => p.id === id));
  g.parts.push(createPart(g, 'fin'));
  assert.notEqual(nextId(g), id);
});
test('same random seed reproduces the same sequence and mutation', () => {
  const a = rng(123),
    b = rng(123);
  assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b));
  assert.deepEqual(mutate(preset(), 55), mutate(preset(), 55));
  assert.notDeepEqual(mutate(preset(), 55), mutate(preset(), 56));
});
test('long mutation sequence never violates genome constraints', () => {
  let g = preset();
  for (let i = 0; i < 300; i++) {
    g = mutate(g, i);
    validateGenome(g);
  }
  assert.equal(g.generation, 300);
});
test('mirrored attachments reflect across the host plane without duplicate midline parts', () => {
  const g = preset(),
    p = expandParts(g);
  for (const gene of g.parts) {
    const pair = p.filter(x => x.id === gene.id);
    if (gene.mirror && Math.abs(gene.anchor[0]) > 0.025) {
      assert.equal(pair.length, 2);
      approx(pair[0].position[0], -pair[1].position[0], 1e-5);
      approx(pair[0].position[1], pair[1].position[1]);
    } else assert.equal(pair.length, 1);
  }
  g.parts[0].anchor = [0, 1, 0];
  assert.equal(expandParts(g).filter(p => p.id === g.parts[0].id).length, 1);
});
test('attachments remain on the implicit surface after body reshaping', () => {
  const g = preset();
  g.nodes[0].radii = [1.2, 1.1, 1.4];
  const nodes = resolveNodes(g);
  for (const p of expandParts(g, nodes)) {
    assert.ok(Math.abs(field(p.position, nodes)) < 1e-5);
    approx(Math.hypot(...p.normal), 1);
  }
});
test('field normal points outward and is finite at cardinal directions', () => {
  const g = preset('sprout'),
    nodes = resolveNodes(g);
  for (const n of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
  ]) {
    const p = projectAnchor(nodes[0], n, nodes);
    const normal = fieldNormal(p.position, nodes);
    assert.ok(normal.every(Number.isFinite));
    assert.ok(normal.reduce((s, v, i) => s + v * n[i], 0) > 0.99);
  }
});
test('angle conversion preserves anchors', () => {
  for (const n of [
    [1, 0, 0],
    [-1, 0.5, 1],
    [0, -1, 0],
    [0.3, 0.7, -0.3],
  ]) {
    const v = normalize(n),
      roundtrip = anglesToNormal(...normalToAngles(v));
    approx(distance(v, roundtrip), 0);
  }
});
test('legless blueprint has a finite crawling fallback', () => {
  const g = preset();
  g.parts = g.parts.filter(p => p.type !== 'leg');
  const a = analyze(g);
  assert.equal(a.legs, 0);
  assert.equal(a.speed, 0.85);
  assert.ok(a.restHeight > 0);
  assert.ok(a.warnings.length);
});
test('IK preserves bone lengths for reachable, unreachable and singular targets', () => {
  const targets = [
    [0, -1, 0],
    [0, -10, 0],
    [0, 0, 0],
    [1, 2, 3],
    [-2, 0, 1],
  ];
  for (const target of targets) {
    const hip = [0, 0, 0],
      r = solveTwoBone(hip, target, 0.8, 0.7, [0, 0, 1]);
    assert.ok([...r.knee, ...r.foot].every(Number.isFinite));
    approx(distance(hip, r.knee), 0.8);
    approx(distance(r.knee, r.foot), 0.7);
  }
});
test('IK hits a reachable target and reports an unreachable target', () => {
  const t = [0.3, -1, 0.2],
    a = solveTwoBone([0, 0, 0], t, 0.8, 0.7, [1, 0, 0]);
  approx(distance(a.foot, t), 0);
  const b = solveTwoBone([0, 0, 0], [0, -9, 0], 0.8, 0.7);
  assert.ok(b.clamped);
  assert.ok(b.error > 7);
});
test('IK handles parallel pole degeneracy', () => {
  const r = solveTwoBone([0, 0, 0], [0, -1, 0], 0.8, 0.7, [0, -1, 0]);
  assert.ok(r.knee.every(Number.isFinite));
  approx(distance(r.knee, r.foot), 0.7);
});
test('IK rejects nonpositive limb lengths', () => {
  assert.throws(() => solveTwoBone([0, 0, 0], [1, 0, 0], 0, 1));
});
test('store protects ownership; caller mutation cannot change its state', () => {
  const s = new GenomeStore(preset()),
    g = s.state;
  g.name = 'not committed';
  assert.equal(s.state.name, 'Mossback');
});
test('failed edit is atomic and creates no history', () => {
  const s = new GenomeStore(preset()),
    before = s.state;
  assert.throws(() =>
    s.change('invalid', g => {
      g.parts[0].size = 300;
    }),
  );
  assert.deepEqual(s.state, before);
  assert.equal(s.past.length, 0);
});
test('undo and redo round trip a committed edit', () => {
  const s = new GenomeStore(preset());
  s.change('rename', g => {
    g.name = 'Noodle';
  });
  assert.equal(s.state.name, 'Noodle');
  s.undo();
  assert.equal(s.state.name, 'Mossback');
  s.redo();
  assert.equal(s.state.name, 'Noodle');
});
test('a slider preview becomes exactly one history entry', () => {
  const s = new GenomeStore(preset()),
    old = s.state.parts[0].size;
  for (let i = 0; i < 20; i++)
    s.preview(g => {
      g.parts[0].size = 1 + i * 0.01;
    });
  assert.equal(s.past.length, 0);
  s.commitPreview();
  assert.equal(s.past.length, 1);
  s.undo();
  assert.equal(s.state.parts[0].size, old);
});
test('cancelled preview restores original without a history entry', () => {
  const s = new GenomeStore(preset()),
    before = s.state;
  s.preview(g => {
    g.name = 'preview';
  });
  s.cancelPreview();
  assert.deepEqual(s.state, before);
  assert.equal(s.past.length, 0);
});
test('invalid preview does not overwrite last valid preview', () => {
  const s = new GenomeStore(preset());
  s.preview(g => {
    g.parts[0].size = 1.5;
  });
  assert.throws(() =>
    s.preview(g => {
      g.parts[0].size = -1;
    }),
  );
  assert.equal(s.state.parts[0].size, 1.5);
  s.commitPreview();
  assert.equal(s.past.length, 1);
});
test('new changes clear redo and history is bounded', () => {
  const s = new GenomeStore(preset(), 4);
  for (let i = 0; i < 10; i++)
    s.change('rename', g => {
      g.name = 'Name ' + i;
    });
  assert.equal(s.past.length, 4);
  s.undo();
  assert.equal(s.future.length, 1);
  s.change('rename', g => {
    g.name = 'Branch';
  });
  assert.equal(s.future.length, 0);
});
test('no-op changes do not pollute history', () => {
  const s = new GenomeStore(preset());
  s.change('same', () => {});
  assert.equal(s.past.length, 0);
});
test('subscribers receive validated snapshots and can unsubscribe', () => {
  const s = new GenomeStore(preset());
  let seen = 0;
  const off = s.subscribe((g, e) => {
    validateGenome(g);
    assert.equal(e.kind, 'commit');
    seen++;
  });
  s.change('rename', g => {
    g.name = 'One';
  });
  off();
  s.change('rename', g => {
    g.name = 'Two';
  });
  assert.equal(seen, 1);
});
test('level generation is deterministic, has eight sensors and unique ids', () => {
  const a = makeLevel(81);
  assert.deepEqual(a, makeLevel(81));
  assert.notDeepEqual(a, makeLevel(82));
  assert.equal(a.spores.length, 8);
  const ids = [...a.spores, ...a.balls].map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(a.spores.every(s => Math.hypot(s.x, s.z) < a.radius - 1));
});

// The production body mesher emits plain buffers and is verified without a GPU.
import { compileBodySurface } from '../src/core/mesher.js';
function assertMesh(data, nodes) {
  assert.ok(data.positions.length > 300);
  assert.equal(data.positions.length, data.normals.length);
  assert.ok(data.positions.every(Number.isFinite));
  assert.ok(data.normals.every(Number.isFinite));
  const edges = new Map();
  for (let i = 0; i < data.indices.length; i += 3) {
    const t = Array.from(data.indices.slice(i, i + 3));
    assert.ok(t.every(x => x < data.positions.length / 3));
    for (let j = 0; j < 3; j++) {
      const a = t[j],
        b = t[(j + 1) % 3],
        key = a < b ? a + ',' + b : b + ',' + a;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  assert.ok(
    [...edges.values()].every(n => n === 2),
    'Generated surface must be a closed two-manifold.',
  );
  for (let i = 0; i < data.positions.length; i += 57) {
    const v = Array.from(data.positions.slice(i, i + 3));
    assert.ok(Math.abs(field(v, nodes)) < data.voxelStep * 0.6);
    approx(Math.hypot(...data.normals.slice(i, i + 3)), 1, 0.00001);
  }
}
for (const name of ['mossback', 'skitter', 'sprout'])
  test(name + ' production mesher emits a closed, finite surface', () => {
    const nodes = resolveNodes(preset(name));
    assertMesh(compileBodySurface(nodes), nodes);
  });
test('high-aspect body unions are not cropped at the grid boundary', () => {
  const g = preset('sprout');
  g.nodes = [
    { id: 'core', parent: null, offset: [0, 0, 0], radii: [0.25, 0.3, 2.4] },
    { id: 'head', parent: 'core', offset: [0, 0, 0.3], radii: [0.25, 0.3, 2.4] },
  ];
  const nodes = resolveNodes(validateGenome(g)),
    mesh = compileBodySurface(nodes);
  assertMesh(mesh, nodes);
  assert.ok(mesh.cells < 80000);
});
test('mesher output is repeatable for the same blueprint', () => {
  const nodes = resolveNodes(preset('sprout'));
  assert.deepEqual(compileBodySurface(nodes), compileBodySurface(nodes));
});
test('mesher rejects invalid quality rather than unbounded allocation', () => {
  const nodes = resolveNodes(preset());
  assert.throws(() => compileBodySurface(nodes, 0));
  assert.throws(() => compileBodySurface(nodes, NaN));
  assert.throws(() => compileBodySurface([], 1));
});
test('application version matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(APP_VERSION, pkg.version);
});
