/** Run against the exact installed engines with npm run test:engine.
 * These are CPU integration tests, NOT a substitute for the GPU browser test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { preset, mutate, createPart, validateGenome } from '../../src/core/genome.js';
import { resolveNodes, analyze, field } from '../../src/core/anatomy.js';
import { buildBodySurface, sweptTube } from '../../src/creature/surface.js';
import { Creature } from '../../src/creature/assemble.js';
import { animateCreature } from '../../src/creature/animator.js';
import { PartRegistry } from '../../src/creature/parts.js';
import { Habitat } from '../../src/game/habitat.js';
import { PhysicsWorld } from '../../src/physics/world.js';
import { makeLevel } from '../../src/core/level.js';
await RAPIER.init();
const still = { x: 0, z: 0, sprint: false };
const approx = (a, b, e = 0.03) => assert.ok(Math.abs(a - b) < e, `${a} is not near ${b}`);
const finiteGeometry = g => {
  for (const name of ['position', 'normal'])
    assert.ok(g.attributes[name].array.every(Number.isFinite), name + ' has non-finite values');
};

test('engines match the requested versions exactly', () => {
  assert.equal(THREE.REVISION, '181');
  assert.equal(RAPIER.version(), '0.19.3');
});
for (const name of ['mossback', 'skitter', 'sprout'])
  test(`${name}: generated body is finite, indexed, closed and outward shaded`, () => {
    const nodes = resolveNodes(preset(name)),
      g = buildBodySurface(nodes);
    finiteGeometry(g);
    assert.ok(g.index.count > 1000);
    assert.ok(g.attributes.position.count < 100000);
    const pos = g.attributes.position,
      normal = g.attributes.normal,
      idx = g.index.array,
      edges = new Map();
    for (let i = 0; i < idx.length; i += 3) {
      const t = [idx[i], idx[i + 1], idx[i + 2]];
      assert.ok(t.every(v => v < pos.count));
      for (let j = 0; j < 3; j++) {
        const a = t[j],
          b = t[(j + 1) % 3],
          k = a < b ? a + ',' + b : b + ',' + a;
        edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
    assert.ok(
      [...edges.values()].every(n => n === 2),
      'body has a non-manifold/boundary edge',
    );
    for (let i = 0; i < pos.count; i += 13) {
      assert.ok(Math.abs(field([pos.getX(i), pos.getY(i), pos.getZ(i)], nodes)) < 0.05);
      approx(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)), 1, 0.001);
    }
    g.dispose();
  });
test('parametric horn tube has valid geometry', () => {
  const g = sweptTube(
    t => [0, t, t * t * 0.3],
    t => 0.2 * (1 - t) + 0.002,
  );
  finiteGeometry(g);
  assert.ok(g.index.count);
  g.dispose();
});
test('registered factories have an explicit duplicate guard', () => {
  const r = new PartRegistry().register('test', () => ({ group: new THREE.Group() }));
  assert.throws(() => r.register('test', () => {}), /Duplicate/);
  assert.throws(() => r.create({ type: 'unknown' }, {}), /Missing/);
});
test('all foundational part factories build and animate with finite transforms', () => {
  const g = preset();
  g.parts.push(createPart(g, 'fin'));
  const c = new Creature(g);
  try {
    for (let i = 0; i < 180; i++) {
      animateCreature(c, 1 / 60, { time: i / 60, preview: true, walking: true, speed: 2 });
      c.root.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite), o.name));
    }
    assert.equal(c.legs.length, 4);
    assert.ok(c.body.geometry.attributes.position.count > 100);
  } finally {
    c.dispose();
  }
});
test('body vertex buffers are cloned rather than sharing GPU ownership', () => {
  const a = new Creature(preset()),
    b = new Creature(preset(), undefined, a.body.geometry);
  assert.notEqual(a.body.geometry, b.body.geometry);
  assert.deepEqual(
    a.body.geometry.attributes.position.array,
    b.body.geometry.attributes.position.array,
  );
  a.dispose();
  finiteGeometry(b.body.geometry);
  b.dispose();
});
test('mutated and single-legged creatures compile and animate', () => {
  for (let i = 0; i < 8; i++) {
    const g = mutate(preset(i % 2 ? 'sprout' : 'skitter'), i + 55);
    if (i === 0) {
      g.parts = g.parts.filter(p => p.type !== 'leg');
      const leg = createPart(g, 'leg');
      leg.mirror = false;
      g.parts.push(leg);
    }
    const c = new Creature(validateGenome(g));
    try {
      animateCreature(c, 0.016, { time: 10, preview: true, walking: true, speed: 2 });
      for (const limb of c.legs) assert.ok(Number.isFinite(limb.error));
    } finally {
      c.dispose();
    }
  }
});
test('generated habitat provides finite convex collision inputs', () => {
  const h = new Habitat();
  try {
    assert.equal(h.solids.length, 22);
    assert.equal(h.spores.size, 8);
    assert.ok(h.solids.every(s => s.vertices.every(Number.isFinite)));
    h.collect('spore0');
    h.update(1, 0.7, null);
    assert.equal(h.bursts.length, 0);
  } finally {
    h.dispose();
  }
});
test('Rapier creature settles on the floor without falling through', () => {
  const a = analyze(preset()),
    p = new PhysicsWorld(RAPIER, a, makeLevel());
  try {
    for (let i = 0; i < 180; i++) p.advance(1 / 60, still);
    const y = p.body.translation().y;
    assert.ok(y > a.restHeight - 0.2 && y < a.restHeight + 0.2);
    assert.ok(p.grounded);
    approx(p.groundHeight(0, 0), 0, 0.02);
  } finally {
    p.dispose();
  }
});
test('drive input produces real rigid-body movement', () => {
  const p = new PhysicsWorld(RAPIER, analyze(preset()), makeLevel());
  try {
    for (let i = 0; i < 90; i++) p.advance(1 / 60, still);
    for (let i = 0; i < 120; i++) p.advance(1 / 60, { x: 1, z: 0 });
    assert.ok(p.body.translation().x > 1);
    const pose = p.sample(0.5);
    assert.equal(pose.position.length, 3);
    assert.ok(pose.position.every(Number.isFinite));
    assert.ok(pose.speed > 0);
  } finally {
    p.dispose();
  }
});
test('jump buffering creates upward impulse and the organism lands again', () => {
  const p = new PhysicsWorld(RAPIER, analyze(preset()), makeLevel());
  try {
    for (let i = 0; i < 120; i++) p.advance(1 / 60, still);
    const y = p.body.translation().y;
    p.queueJump();
    let top = y;
    for (let i = 0; i < 100; i++) {
      p.advance(1 / 60, still);
      top = Math.max(top, p.body.translation().y);
    }
    assert.ok(top > y + 0.45);
    assert.equal(p.jumps, 1);
    approx(p.body.translation().y, y, 0.1);
  } finally {
    p.dispose();
  }
});
test('spore sensors fire once without creating solid collisions', () => {
  const level = makeLevel();
  level.spores = [{ id: 'spore0', x: 0, y: 0.55, z: 0 }];
  let count = 0;
  const p = new PhysicsWorld(RAPIER, analyze(preset()), level, [], () => count++);
  try {
    for (let i = 0; i < 180; i++) p.advance(1 / 60, still);
    assert.equal(p.collected.size, 1);
    assert.equal(count, 1);
  } finally {
    p.dispose();
  }
});
test('fixed stepping agrees across 30 and 60 Hz display updates', () => {
  const a = analyze(preset()),
    level = makeLevel();
  level.spores = [];
  level.balls = [];
  const p = new PhysicsWorld(RAPIER, a, level),
    q = new PhysicsWorld(RAPIER, a, level);
  try {
    for (let i = 0; i < 120; i++) p.advance(1 / 60, { x: 0.2, z: 0.8 });
    for (let i = 0; i < 60; i++) q.advance(1 / 30, { x: 0.2, z: 0.8 });
    const a = p.body.translation(),
      b = q.body.translation();
    approx(a.x, b.x, 0.005);
    approx(a.y, b.y, 0.005);
    approx(a.z, b.z, 0.005);
  } finally {
    p.dispose();
    q.dispose();
  }
});
test('long frames have bounded work; reset has nonnegative interpolation', () => {
  const p = new PhysicsWorld(RAPIER, analyze(preset()), makeLevel());
  try {
    p.advance(5, still);
    assert.ok(p.elapsed <= 0.11);
    assert.ok(p.droppedTime >= 4.9);
    p.body.setTranslation({ x: 80, y: 2, z: 0 }, true);
    const alpha = p.advance(1 / 60, still);
    assert.ok(alpha >= 0 && alpha <= 1);
    assert.ok(Math.abs(p.body.translation().x) < 1);
    assert.throws(() => p.advance(NaN, still));
  } finally {
    p.dispose();
  }
});
test('Rapier debug geometry is consistent and disposal is explicit', () => {
  const p = new PhysicsWorld(RAPIER, analyze(preset()), makeLevel());
  const d = p.world.debugRender();
  assert.ok(d.vertices.length > 0);
  assert.equal(d.colors.length / 4, d.vertices.length / 3);
  p.dispose();
  assert.equal(p.dynamic.size, 0);
});

// V2 integration checks. These require the real pinned engine packages.
import { PRESET_MODELS } from '../../src/core/presets.js';
import { CATALOG } from '../../src/core/catalog.js';
import { mixGenomes } from '../../src/core/mixer.js';
import { MOTION_CLIPS, defaultMotion } from '../../src/core/motion.js';
import { defaultRegistry } from '../../src/creature/parts.js';
test('every catalog part has a runtime factory', () => {
  const r = defaultRegistry();
  assert.equal(r.factories.size, Object.keys(CATALOG).length);
  for (const key of Object.keys(CATALOG)) assert.ok(r.factories.has(key));
});
for (const { id } of PRESET_MODELS)
  test(`catalog ${id}: builds and animates with finite geometry`, () => {
    const c = new Creature(preset(id));
    try {
      for (const clip of Object.keys(MOTION_CLIPS)) {
        c.genome.motion = defaultMotion(clip);
        animateCreature(c, 0, { time: 2.5, preview: true, seek: true });
        c.root.traverse(o => {
          assert.ok(o.matrixWorld.elements.every(Number.isFinite));
          if (o.isMesh) finiteGeometry(o.geometry);
        });
      }
    } finally {
      c.dispose();
      c.dispose();
    }
  });
test('every new part builds with all three variants and a fixed motion gain', () => {
  const types = Object.keys(CATALOG);
  // Keep each specimen below the public 32-gene limit as the catalog grows.
  for (let variant = 0; variant <= 2; variant++)
    for (let offset = 0; offset < types.length; offset += 16) {
      const g = preset('mossback');
      g.parts = [];
      for (const type of types.slice(offset, offset + 16)) {
        const part = createPart(g, type);
        part.variant = variant;
        part.flex = 0;
        g.parts.push(part);
      }
      const c = new Creature(g);
      try {
        for (const time of [0, 1.2, 8]) {
          animateCreature(c, 0, { time, preview: true, seek: true });
          c.root.traverse(o => {
            assert.ok(o.matrixWorld.elements.every(Number.isFinite));
            if (o.isMesh) finiteGeometry(o.geometry);
          });
        }
      } finally {
        c.dispose();
      }
    }
});
test('mixed creature compiles without sharing source runtime resources', () => {
  const result = mixGenomes(preset('carapace'), preset('glider')),
    c = new Creature(result.genome);
  try {
    animateCreature(c, 0.016, { time: 1.5, preview: true });
    assert.ok(c.parts.length > 0);
    assert.ok(c.body.geometry.index.count > 0);
  } finally {
    c.dispose();
  }
});
test('appearance edits preserve geometry and replace only changed microtextures', () => {
  const c = new Creature(preset('lantern')),
    geometry = c.body.geometry,
    material = c.materials.skin,
    pore = c.materials.pore;
  let released = 0;
  pore.addEventListener('dispose', () => released++);
  try {
    const g = structuredClone(c.genome);
    g.appearance.roughness = 0.8;
    c.updateAppearance(g);
    assert.equal(c.body.geometry, geometry);
    assert.equal(c.materials.skin, material);
    assert.equal(c.materials.pore, pore);
    assert.equal(material.roughness, 0.8);
    g.appearance.textureSeed++;
    c.updateAppearance(g);
    assert.notEqual(c.materials.pore, pore);
    assert.equal(released, 1);
    assert.equal(c.materials.uniforms.uSkinLayers.value.length, 4);
  } finally {
    c.dispose();
  }
});
test('material shader patch injects four layer uniforms into Three shader source', () => {
  const c = new Creature(preset('reef'));
  try {
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    };
    c.materials.skin.onBeforeCompile(shader);
    assert.ok(shader.vertexShader.includes('vSkinPosition = position;'));
    assert.ok(shader.fragmentShader.includes('layeredPigment(vSkinPosition'));
    assert.equal(shader.uniforms.uSkinLayers.value.length, 4);
  } finally {
    c.dispose();
  }
});
