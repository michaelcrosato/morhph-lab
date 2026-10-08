/** Requires the real Three.js r181 package. No mocks and no pass-on-skip path.
 * These tests check CPU geometry and animation. They do not compile GPU shaders. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { preset, createPart, validateGenome } from '../src/core/genome.js';
import { EXPANSION_PARTS, PART_MATERIALS } from '../src/core/expansion-catalog.js';
import { HUMANOID_CONTENT, CREATURE_CONTENT } from '../src/core/content-pack.js';
import { EXPANSION_ACTIONS } from '../src/core/expansion-motion.js';
import { PATTERNS, MICRO_SURFACES } from '../src/core/surfaces.js';
import { applyPartKit, PART_KITS } from '../src/core/kits.js';
import { Creature } from '../src/creature/assemble.js';
import { animateCreature } from '../src/creature/animator.js';

const sample = (c, time) =>
  animateCreature(c, 0, { time, preview: true, seek: true, grounded: true });
function finiteTree(root) {
  root.updateMatrixWorld(true);
  root.traverse(o => {
    assert.ok(o.matrixWorld.elements.every(Number.isFinite), o.name + ' matrix');
    if (!o.isMesh) return;
    for (const attr of Object.values(o.geometry.attributes))
      assert.ok(attr.array.every(Number.isFinite), o.name + ' geometry');
    if (o.geometry.index) {
      const n = o.geometry.attributes.position.count;
      assert.ok(
        o.geometry.index.array.every(i => i >= 0 && i < n),
        'index bounds',
      );
    }
    o.geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(o.geometry.boundingSphere.radius), 'bounds');
  });
}
function poseState(group) {
  const state = [];
  group.traverse(o => {
    state.push([...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()]);
    if (o.isMesh) state.push(Array.from(o.geometry.attributes.position.array));
  });
  return state;
}
function fullPack(base, variant = 0, material = 'inherit') {
  const g = preset(base);
  g.parts = [];
  for (const type of Object.keys(EXPANSION_PARTS)) {
    const p = createPart(g, type);
    Object.assign(p, { variant, material });
    g.parts.push(p);
  }
  return validateGenome(g);
}
test('content factories run on Three.js r181', () => assert.equal(THREE.REVISION, '181'));
for (const base of ['wayfarer', 'sprout'])
  for (let variant = 0; variant < 3; variant++)
    test(
      base + ' / shape ' + variant + ': all expansion parts build and keep attachment frames',
      () => {
        const c = new Creature(fullPack(base, variant));
        try {
          assert.ok(c.parts.length >= 12);
          for (const runtime of c.parts) {
            const q = runtime.group.quaternion.toArray(),
              pos = runtime.group.position.toArray();
            let count = 0;
            runtime.group.traverse(o => {
              if (o.isMesh) count++;
            });
            assert.ok(count >= 1, runtime.part.type);
            for (const time of [0, 0.7, 2.4, 10]) {
              runtime.update?.(time, 0, { layers: { flex: 1, gaze: 1, jaw: 1 }, jaw: 0.3 });
              assert.deepEqual(
                runtime.group.quaternion.toArray(),
                q,
                'part update must not overwrite its socket rotation',
              );
              assert.deepEqual(
                runtime.group.position.toArray(),
                pos,
                'part update must not move its attachment',
              );
              finiteTree(runtime.group);
            }
            runtime.update?.(1.1, 0, { layers: { flex: 0.8 }, jaw: 0.2 });
            const a = poseState(runtime.group);
            runtime.update?.(4.7, 0, { layers: { flex: 0.8 }, jaw: 0.2 });
            runtime.update?.(1.1, 0, { layers: { flex: 0.8 }, jaw: 0.2 });
            assert.deepEqual(
              poseState(runtime.group),
              a,
              'procedural time sampling must be reversible',
            );
          }
          sample(c, 1.2);
          finiteTree(c.root);
        } finally {
          c.dispose();
          c.dispose();
        }
      },
    );
for (const material of PART_MATERIALS)
  test('independent part material / ' + material, () => {
    const c = new Creature(fullPack('wayfarer', 1, material));
    try {
      for (const p of c.parts) {
        let matched = 0;
        p.group.traverse(o => {
          if (
            o.isMesh &&
            c.materials[material] &&
            o.material.type === c.materials[material].type &&
            o.material.color.equals(c.materials[material].color) &&
            o.material.roughness === c.materials[material].roughness &&
            o.material.metalness === c.materials[material].metalness
          )
            matched++;
        });
        if (material !== 'inherit') assert.ok(matched > 0, p.part.type);
      }
      sample(c, 2.1);
      finiteTree(c.root);
    } finally {
      c.dispose();
    }
  });
for (const { id } of [...HUMANOID_CONTENT, ...CREATURE_CONTENT])
  test('content model ' + id + ' / finite geometry and animation', () => {
    const c = new Creature(preset(id));
    try {
      for (const time of [0, 0.5, 1.7, 4.3]) {
        sample(c, time);
        finiteTree(c.root);
      }
      if (c.humanoid)
        for (const action of Object.keys(EXPANSION_ACTIONS)) {
          c.genome.motion.humanoid.action = action;
          c.genome.motion.humanoid.repeat = false;
          sample(c, 0);
          for (const time of [0.4, 1, 4]) {
            sample(c, time);
            finiteTree(c.root);
          }
          c.humanoid.skeleton.update();
          assert.ok(c.humanoid.skeleton.boneMatrices.every(Number.isFinite));
        }
    } finally {
      c.dispose();
    }
  });
for (const id of Object.keys(PART_KITS))
  test('kit ' + id + ' compiles as editable runtime parts', () => {
    const c = new Creature(applyPartKit(preset('wayfarer'), id).genome);
    try {
      assert.ok(c.parts.length >= PART_KITS[id].parts.length);
      sample(c, 1.8);
      finiteTree(c.root);
    } finally {
      c.dispose();
    }
  });
test('all pigment IDs map to material uniforms without a geometry rebuild', () => {
  const c = new Creature(preset('duelist')),
    geometry = c.body.geometry;
  try {
    for (const pattern of PATTERNS) {
      const g = structuredClone(c.genome);
      g.appearance.pattern = pattern;
      c.updateAppearance(g);
      assert.equal(c.materials.uniforms.uSkinLayers.value[0].x, PATTERNS.indexOf(pattern));
      assert.equal(c.body.geometry, geometry);
    }
    for (const micro of MICRO_SURFACES) {
      const g = structuredClone(c.genome);
      g.appearance.micro = micro;
      c.updateAppearance(g);
      assert.equal(c.materials.pore.image.data.length, 128 * 128 * 4);
      assert.equal(c.materials.cloth.bumpMap, c.materials.pore);
    }
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    };
    c.materials.skin.onBeforeCompile(shader);
    assert.ok(shader.fragmentShader.includes('layeredPigment(vSkinPosition'));
    assert.equal(shader.uniforms.uSkinLayers.value.length, 4);
  } finally {
    c.dispose();
  }
});
