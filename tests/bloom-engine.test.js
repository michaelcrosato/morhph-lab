/** Requires both pinned packages. These checks do not certify GPU shaders. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { BLOOM_MODELS } from '../src/core/bloom-catalog.js';
import { preset } from '../src/core/genome.js';
import { analyze } from '../src/core/anatomy.js';
import { Creature } from '../src/creature/assemble.js';
import { animateCreature } from '../src/creature/animator.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { Habitat } from '../src/game/habitat.js';
import { PhysicsWorld } from '../src/physics/world.js';
import { makeTravelLevel } from '../src/core/travel-level.js';
await RAPIER.init();
test('exact engine pins', () => {
  assert.equal(THREE.REVISION, '181');
  assert.equal(RAPIER.version(), '0.19.3');
});
for (const { id, medium } of BLOOM_MODELS.filter(m => m.family !== 'humanoid'))
  test(id + ': actual Three object graph, reusable buffers, no accumulated deformation', () => {
    const g = preset(id),
      c = new Creature(g);
    try {
      const original = c.restSurface.attributes.position.array.slice(),
        compiler = new FoundationCompiler(g);
      for (const time of [0, 0.26, 0.74, 2.31, 0]) {
        animateCreature(c, 0, { time, preview: true, seek: true });
        c.root.traverse(o => {
          assert.ok(o.matrixWorld.elements.every(Number.isFinite));
          if (o.isMesh) {
            assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
            assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));
          }
        });
        assert.deepEqual(c.restSurface.attributes.position.array, original);
      }
      const expected = compiler.sample({ pose: 'motion-cycle', phase: 0.13 }),
        sample = expected.meshes[0];
      animateCreature(c, 0, { time: 0.26, preview: true, seek: true });
      const pos = c.body.geometry.attributes.position,
        world = new THREE.Vector3();
      c.root.updateMatrixWorld(true);
      // Both compilers add the same rest-height transform at the root.
      for (let i = 0; i < pos.count; i += 101) {
        world.fromBufferAttribute(pos, i).applyMatrix4(c.body.matrixWorld);
        const e = new THREE.Vector3().fromArray(sample.positions, i * 3);
        assert.ok(world.distanceTo(e) < 0.002);
      }
      c.genome.motion.bodyWave.kind = 'rigid';
      animateCreature(c, 0, { time: 1, preview: true, seek: true });
      assert.deepEqual(c.body.geometry.attributes.position.array, original);
    } finally {
      c.dispose();
    }
    const h = new Habitat(810, { medium });
    assert.equal(h.medium, medium);
    h.dispose();
  });
for (const medium of ['water', 'air'])
  test(
    medium + ': Rapier advances in three axes, brakes, resets, and stays within the volume',
    () => {
      const g = preset(medium === 'water' ? 'clapshell' : 'bloomkite'),
        level = makeTravelLevel(810, medium),
        p = new PhysicsWorld(RAPIER, analyze(g), level);
      try {
        const start = p.body.translation().y;
        for (let i = 0; i < 90; i++) p.advance(1 / 60, { x: 0, y: 0, z: 0 });
        assert.ok(Math.abs(p.body.translation().y - start) < 0.05);
        for (let i = 0; i < 120; i++) p.advance(1 / 60, { x: 0.6, y: 0.7, z: 0 });
        assert.ok(p.body.translation().x > 1);
        assert.ok(p.body.translation().y > start + 1);
        for (let i = 0; i < 300; i++) p.advance(1 / 60, { x: 0, y: 1, z: 0 });
        assert.ok(p.body.translation().y < level.travelBounds.maxY + 0.7);
        for (let i = 0; i < 90; i++) p.advance(1 / 60, { x: 0, y: 0, z: 0 });
        assert.ok(Math.hypot(...Object.values(p.body.linvel())) < 0.1);
        p.queueJump();
        assert.equal(p.jumpBuffer, 0);
        p.reset();
        assert.ok(Math.abs(p.body.translation().y - level.spawnY) < 0.1);
        assert.equal(p.bank, 0);
      } finally {
        p.dispose();
      }
    },
  );

// Humanoid CPU poses are diagnostic; do not assert runtime IK pose equality.
for (const { id } of BLOOM_MODELS.filter(m => m.family === 'humanoid'))
  test(id + ': actual humanoid skeleton and joint-mounted parts remain finite', () => {
    const c = new Creature(preset(id));
    try {
      for (const time of [0, 0.2, 0.8, 1.4, 3.1, 0]) {
        animateCreature(c, 0, { time, preview: true, seek: true });
        c.root.updateMatrixWorld(true);
        c.root.traverse(o => {
          assert.ok(o.matrixWorld.elements.every(Number.isFinite));
          if (o.isMesh) {
            assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
            assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));
          }
        });
      }
    } finally {
      c.dispose();
    }
  });
