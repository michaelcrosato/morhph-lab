/** Real engine integration. Run after npm install. No engine mocks or skip fallback. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { preset, createPart, validateGenome } from '../../src/core/genome.js';
import { HUMANOID_MODELS } from '../../src/core/humanoid.js';
import { HUMANOID_ACTIONS } from '../../src/core/humanoid-motion.js';
import { Creature } from '../../src/creature/assemble.js';
import { animateCreature } from '../../src/creature/animator.js';
import { PhysicsWorld } from '../../src/physics/world.js';
import { makeLevel } from '../../src/core/level.js';
import { analyze } from '../../src/core/anatomy.js';
import { restPickPoint } from '../../src/render/picking.js';
await RAPIER.init();
const finite = o =>
  assert.ok(o.matrixWorld.elements.every(Number.isFinite), o.name + ' has a non-finite matrix');
const context = (time, extra = {}) => ({
  time,
  preview: true,
  speed: 0,
  grounded: true,
  seek: true,
  ...extra,
});
test('exact requested engines are installed', () => {
  assert.equal(THREE.REVISION, '181');
  assert.equal(RAPIER.version(), '0.19.3');
});
for (const { id } of HUMANOID_MODELS)
  test(id + ': actual skeleton, skinning, actions, and disposal', () => {
    const c = new Creature(preset(id));
    try {
      assert.equal(c.humanoid.skeleton.bones.length, 22);
      assert.equal(c.legs.length, 2);
      assert.ok(c.body.isSkinnedMesh);
      assert.equal(
        c.body.geometry.attributes.skinWeight.count,
        c.body.geometry.attributes.position.count,
      );
      for (const action of Object.keys(HUMANOID_ACTIONS)) {
        Object.assign(c.genome.motion.humanoid, { action, repeat: false });
        animateCreature(c, 0, context(0));
        for (const time of [0.2, 0.55, 1, 2, 5]) {
          animateCreature(c, 1 / 60, context(time));
          c.root.traverse(finite);
          c.humanoid.skeleton.update();
          assert.ok(c.humanoid.skeleton.boneMatrices.every(Number.isFinite));
          const pos = c.body.geometry.attributes.position;
          for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 32)))
            assert.ok(
              c.body.getVertexPosition(i, new THREE.Vector3()).toArray().every(Number.isFinite),
            );
        }
      }
    } finally {
      c.dispose();
      c.dispose();
    }
  });
test('hand attachments are parented to their matching animated bones', () => {
  const g = preset('wayfarer'),
    p = createPart(g, 'horn', 'chest', [1, 0, 0], true);
  p.socket = 'hand';
  g.parts.push(p);
  const c = new Creature(validateGenome(g));
  try {
    assert.deepEqual(new Set(c.parts.map(p => p.group.parent.name)), new Set(['hand.L', 'hand.R']));
    c.genome.motion.humanoid.action = 'wave';
    animateCreature(c, 0, context(0));
    const before = c.humanoid.bones['hand.R'].getWorldPosition(new THREE.Vector3());
    animateCreature(c, 0.6, context(0.6));
    const after = c.humanoid.bones['hand.R'].getWorldPosition(new THREE.Vector3());
    assert.ok(before.distanceTo(after) > 0.1);
  } finally {
    c.dispose();
  }
});
test('grounded humanoid IK is finite and holds feet near the workshop floor', () => {
  const c = new Creature(preset('warden'));
  try {
    for (let i = 0; i < 120; i++)
      animateCreature(c, 1 / 60, { time: i / 60, preview: true, speed: 0, grounded: true });
    for (const limb of c.legs) {
      assert.ok(limb.error < 0.15);
      const y = limb.footBone.getWorldPosition(new THREE.Vector3()).y;
      assert.ok(
        Math.abs(y - c.humanoid.layout.footHeight - 0.025 * c.humanoid.layout.scale) < 0.12,
      );
    }
  } finally {
    c.dispose();
  }
});
test('animated skin selection maps a posed triangle back to rest space', () => {
  const c = new Creature(preset('ranger'));
  try {
    c.genome.motion.humanoid.action = 'cast';
    animateCreature(c, 0, context(0));
    animateCreature(c, 0.8, context(0.8));
    const mesh = c.body,
      index = mesh.geometry.index,
      ids = [index.getX(120), index.getX(121), index.getX(122)];
    const point = new THREE.Vector3();
    for (const i of ids)
      point.add(mesh.getVertexPosition(i, new THREE.Vector3()).multiplyScalar(1 / 3));
    mesh.localToWorld(point);
    const rest = restPickPoint(
        { object: mesh, point, face: { a: ids[0], b: ids[1], c: ids[2] } },
        c,
      ),
      expected = new THREE.Vector3();
    for (const i of ids)
      expected.add(
        new THREE.Vector3()
          .fromBufferAttribute(mesh.geometry.attributes.position, i)
          .multiplyScalar(1 / 3),
      );
    assert.ok(rest.distanceTo(expected) < 1e-4);
  } finally {
    c.dispose();
  }
});
test('animation markers do not move the physics root', () => {
  const c = new Creature(preset('wayfarer')),
    events = [];
  c.root.addEventListener('animation-marker', e => events.push(e.marker));
  try {
    Object.assign(c.genome.motion.humanoid, { action: 'attack', repeat: false });
    const start = c.root.position.clone();
    for (let i = 0; i < 120; i++)
      animateCreature(c, 1 / 60, { time: i / 60, preview: true, grounded: true });
    assert.equal(events.filter(e => e.name === 'attack-contact').length, 1);
    assert.ok(c.root.position.equals(start));
  } finally {
    c.dispose();
  }
});
for (const id of ['wayfarer', 'goblin', 'ogre'])
  test(id + ': upright Rapier body settles and moves', () => {
    const analysis = analyze(preset(id)),
      world = new PhysicsWorld(RAPIER, analysis, makeLevel(8128), []);
    try {
      for (let i = 0; i < 180; i++) world.advance(1 / 60, { x: 0, z: 0 });
      const start = world.body.translation();
      assert.ok(Math.abs(start.y - analysis.restHeight) < 0.35);
      for (let i = 0; i < 90; i++) world.advance(1 / 60, { x: 0, z: 1 });
      const p = world.body.translation();
      assert.ok([p.x, p.y, p.z].every(Number.isFinite));
      assert.ok(p.z > start.z + 0.2);
    } finally {
      world.dispose();
    }
  });
