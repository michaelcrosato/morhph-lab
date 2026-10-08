/** Requires the actual pinned Three.js package. No substitutes or skip fallback.
 * npm run test:review-engine. This checks the adapter, not GPU rendering. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Creature } from '../src/creature/assemble.js';
import {
  foundationBlueprint,
  FoundationCompiler,
  sampleFoundationBones,
} from '../src/review/foundation.js';
import { humanoidDetailPlan } from '../src/core/foundation-shapes.js';
import { syncHumanoidBody } from '../src/core/humanoid.js';
test('real engine revision is pinned to r181', () => assert.equal(THREE.REVISION, '181'));
for (const style of ['classic', 'defined'])
  test(style + ' body and primitive buffers are shared between review and game', () => {
    const g = foundationBlueprint('balanced');
    g.rig.bodyStyle = style;
    syncHumanoidBody(g);
    const c = new Creature(g),
      compiler = new FoundationCompiler(g);
    try {
      assert.deepEqual(c.body.geometry.attributes.position.array, compiler.body.positions);
      assert.deepEqual(c.body.geometry.index.array, compiler.body.indices);
      for (const n of humanoidDetailPlan(g.rig).nodes) {
        const object = c.root.getObjectByName(n.id);
        assert.ok(object, n.id);
        if (n.kind === 'mesh') {
          assert.deepEqual(
            object.geometry.attributes.position.array,
            compiler.primitives[n.geometry].positions,
          );
          assert.deepEqual(object.geometry.index.array, compiler.primitives[n.geometry].indices);
        }
      }
    } finally {
      c.dispose();
    }
  });
for (const pose of ['bind', 'reach', 'twist', 'crouch', 'sit'])
  test(pose + ' CPU skin positions match the actual Three skeleton transform', () => {
    const g = foundationBlueprint('balanced'),
      c = new Creature(g),
      compiler = new FoundationCompiler(g),
      mat = sampleFoundationBones(g.rig, pose, 0.7),
      snapshot = compiler.sample({ pose, phase: 0.7 });
    try {
      c.root.position.set(0, mat.groundLift, 0);
      c.torso.position.set(0, 0, 0);
      c.torso.quaternion.identity();
      for (const d of mat.spec) {
        const parent = new THREE.Matrix4().fromArray(d.parent ? mat.world[d.parent] : mat.root),
          local = parent.invert().multiply(new THREE.Matrix4().fromArray(mat.world[d.name]));
        local.decompose(
          c.humanoid.bones[d.name].position,
          c.humanoid.bones[d.name].quaternion,
          c.humanoid.bones[d.name].scale,
        );
      }
      c.root.updateMatrixWorld(true);
      c.humanoid.skeleton.update();
      const positions = snapshot.meshes[0].positions;
      for (let i = 0; i < positions.length / 3; i += 7) {
        const actual = c.body
            .getVertexPosition(i, new THREE.Vector3())
            .applyMatrix4(c.body.matrixWorld),
          expected = new THREE.Vector3().fromArray(positions, i * 3);
        assert.ok(actual.distanceTo(expected) < 3e-5, 'skin vertex ' + i);
      }
    } finally {
      c.dispose();
    }
  });
