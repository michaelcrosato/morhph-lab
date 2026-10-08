import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePacking, packMeshes } from '../src/export/packing.js';
import { preset, serializeGenome, createPart } from '../src/core/genome.js';
import { buildDelivery, deliveryOptions } from '../src/export/delivery.js';
import { readDeliveryGLB, deliveryPose } from '../src/export/glb.js';
const maxError = (a, b) => {
  let m = 0;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
const triangle = (name, material) => ({
  name,
  material,
  positions: Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: Uint32Array.from([0, 1, 2]),
});
test('material layout preserves every vertex and triangle; same material only', () => {
  const src = [triangle('a', 'skin'), triangle('b', 'skin'), triangle('c', 'metal')],
    p = compilePacking(src, 'material'),
    out = packMeshes(p, src, () => new Float32Array(9).fill(0.5));
  assert.equal(out.length, 2);
  assert.deepEqual([...out[0].indices], [0, 1, 2, 3, 4, 5]);
  assert.equal(out[0].sourceRanges[1].name, 'b');
  assert.deepEqual(src[1].indices, Uint32Array.from([0, 1, 2]));
  assert.equal(out[0].vertexColors.length, 18);
});
test('separate layout preserves original mesh names', () => {
  const s = [triangle('a', 'skin'), triangle('b', 'skin')];
  assert.deepEqual(
    packMeshes(compilePacking(s), s).map(m => m.name),
    ['a', 'b'],
  );
});
test('packing refuses duplicate names, unknown mode, changed count and topology', () => {
  const a = triangle('a', 'skin');
  assert.throws(() => compilePacking([a, a]));
  assert.throws(() => compilePacking([a], 'weld'));
  assert.throws(() => deliveryOptions({ meshLayout: 'simplify' }));
  const p = compilePacking([a], 'material');
  assert.throws(() => packMeshes(p, []));
  assert.throws(() => packMeshes(p, [{ ...a, indices: Uint32Array.from([1, 0, 2]) }]));
  assert.throws(() => packMeshes(p, [{ ...a, material: 'cloth' }]));
});
for (const id of [
  'wayfarer',
  'mossback',
  'glider',
  'tendril',
  'goblin',
  'archivist',
  'moonbell',
  'glassdart',
])
  test(
    id + ': packed GLB preserves source attributes and animation, with a recoverable range map',
    async () => {
      const g = preset(id),
        source = serializeGenome(g),
        settings = { mode: 'motion', frames: 3, acknowledgeWarnings: true },
        a = await buildDelivery(g, { ...settings, meshLayout: 'separate' }),
        b = await buildDelivery(g, { ...settings, meshLayout: 'material' });
      assert.equal(serializeGenome(g), source);
      assert.equal(a.manifest.totals.vertices, b.manifest.totals.vertices);
      assert.equal(a.manifest.totals.triangles, b.manifest.totals.triangles);
      assert.ok(b.manifest.totals.meshes < a.manifest.totals.meshes);
      assert.equal(b.manifest.packing.verticesRemoved, 0);
      for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
        const time = phase * a.manifest.animation.durationSeconds,
          x = deliveryPose(a.glb, time),
          y = deliveryPose(b.glb, time),
          byName = new Map(x.map(m => [m.name, m]));
        for (const batch of b.manifest.packing.sourceRanges) {
          const m = y.find(m => m.name === batch.name);
          for (const r of batch.ranges) {
            const ref = byName.get(r.name),
              start = r.firstVertex * 3,
              end = start + r.vertexCount * 3;
            assert.ok(maxError(m.positions.subarray(start, end), ref.positions) < 1e-6);
            assert.ok(maxError(m.normals.subarray(start, end), ref.normals) < 1e-6);
            assert.equal(maxError(m.colors.subarray(start, end), ref.colors), 0);
            for (let k = 0; k < r.indexCount; k++)
              assert.equal(m.indices[r.firstIndex + k] - r.firstVertex, ref.indices[k]);
          }
        }
      }
      assert.ok(b.report.internalGLBRoundTrip.maxPositionError < 1e-5);
      assert.equal(b.report.gpuVerified, false);
    },
  );
test('packing is deterministic and does not mark technical warnings approved', async () => {
  const g = preset('mossback'),
    o = { meshLayout: 'material', target: 'crowd', acknowledgeWarnings: true },
    a = await buildDelivery(g, o),
    b = await buildDelivery(g, o);
  assert.deepEqual(a.zip, b.zip);
  assert.ok(a.report.warningCount > 0);
  assert.equal(a.manifest.checks.visualApproval, false);
});
test('inactive genes remain explicit in the asset manifest', async () => {
  const g = preset('wayfarer');
  g.parts.push(createPart(g, 'leg'));
  const r = await buildDelivery(g, { meshLayout: 'material' });
  assert.equal(r.manifest.inactiveGenes.length, 1);
  assert.equal(r.manifest.geometry.allActiveGenesIncluded, true);
  assert.equal(r.manifest.geometry.allGenesIncluded, false);
});
