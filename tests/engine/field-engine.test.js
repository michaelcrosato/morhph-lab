/** Real Three.js adapter checks. Requires the installed pinned engine, no mocks or skips. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Creature } from '../../src/creature/assemble.js';
import { animateCreature } from '../../src/creature/animator.js';
import { FIELD_MODELS, FIELD_PARTS } from '../../src/core/field-catalog.js';
import { EXPANSION_PARTS } from '../../src/core/expansion-catalog.js';
import { preset, createPart, validateGenome } from '../../src/core/genome.js';
test('Field adapter uses exactly Three.js r181', () => assert.equal(THREE.REVISION, '181'));
for (const { id } of FIELD_MODELS)
  test(id + ': real meshes construct, animate and dispose', () => {
    const c = new Creature(preset(id));
    try {
      for (const time of [0, 0.37, 1.1]) {
        animateCreature(c, 0.016, { time, speed: 0, preview: true, seek: true });
        c.root.updateMatrixWorld(true);
        c.root.traverse(o => {
          if (o.isMesh) {
            assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
            assert.ok(o.matrixWorld.elements.every(Number.isFinite));
          }
        });
      }
    } finally {
      c.dispose();
    }
  });
for (const type of Object.keys({ ...EXPANSION_PARTS, ...FIELD_PARTS }))
  test(type + ': all three variants have a real runtime factory', () => {
    for (let variant = 0; variant < 3; variant++) {
      const g = preset('wayfarer');
      g.parts = [{ ...createPart(g, type), variant, mirror: false }];
      const c = new Creature(validateGenome(g));
      try {
        assert.equal(c.parts.length, 1);
        animateCreature(c, 0.016, { time: 0.51, preview: true, seek: true, speed: 0 });
      } finally {
        c.dispose();
      }
    }
  });
