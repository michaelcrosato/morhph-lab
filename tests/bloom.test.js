import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BLOOM_MODELS, BLOOM_PARTS, BLOOM_KITS } from '../src/core/bloom-catalog.js';
import { BLOOM_MOTION, BLOOM_ACTIONS } from '../src/core/bloom-motion.js';
import { BLOOM_PATTERNS, BLOOM_MICRO, BLOOM_SURFACES } from '../src/core/bloom-surfaces.js';
import { prepareBloomMotion, bloomSupportPoints } from '../src/core/bloom-geometry.js';
import { applyPartArray } from '../src/core/part-arrays.js';
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
  generateMicroTexture,
  PATTERNS,
  MICRO_SURFACES,
  SURFACE_PRESETS,
} from '../src/core/surfaces.js';
import {
  defaultHumanoidMotion,
  sampleHumanoidAction,
  collectActionEvents,
} from '../src/core/humanoid-motion.js';
import { applyPartKit } from '../src/core/kits.js';
import { GenomeStore } from '../src/core/store.js';
import { actorManifest, generateActorBatch, parseActorRoster } from '../src/core/actors.js';
import {
  defaultMixSettings,
  mixGenomes,
  createMixRecipe,
  parseMixRecipe,
} from '../src/core/mixer.js';
import {
  FoundationCompiler,
  sampleFoundationBones,
  motionCycleTime,
} from '../src/review/foundation.js';
import { ReviewSession, parseReviewSession } from '../src/review/session.js';
import { auditSnapshot } from '../src/review/audit.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { reviewPattern } from '../src/review/pigment.js';
import { transform } from '../src/review/math.js';
import { hostBone, socketBone } from '../src/core/humanoid.js';
const finite = x => assert.ok(Array.from(x).every(Number.isFinite));
const near = (a, b, e = 1e-5) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const digest = x =>
  createHash('sha256')
    .update(Buffer.from(x.buffer, x.byteOffset, x.byteLength))
    .digest('hex');
const animation = {
  ...sampleMotion(defaultMotion('ripplewalk')),
  stepBank: 1,
  valve: 1,
  bloom: 1,
  reach: 1,
  pad: 1,
  sense: 1,
  fold: 1,
};
function gene(type, variant = 0, mirror = false) {
  const g = preset('sprout');
  g.parts = [
    { ...createPart(g, type, 'core', [1, 0.22, 0.05], mirror), variant, size: 0.8, length: 1.15 },
  ];
  return expandParts(validateGenome(g));
}
function source(type = 'whiskerfan', socket = 'body') {
  const g = preset(socket === 'body' ? 'sprout' : 'wayfarer');
  g.parts = [
    { ...createPart(g, type, socket === 'body' ? 'core' : 'head', [1, 0.2, 0.1], false), socket },
  ];
  return validateGenome(g);
}
const all = t => {
  const s = defaultMixSettings();
  for (const k in s.channels) s.channels[k] = t;
  return s;
};

test('Carapace & Bloom adds 14 distinct recipes across four role groups', () => {
  assert.equal(BLOOM_MODELS.length, 14);
  assert.equal(BLOOM_MODELS.filter(m => m.family === 'humanoid').length, 4);
  assert.equal(BLOOM_MODELS.filter(m => m.medium === 'water').length, 4);
  assert.equal(BLOOM_MODELS.filter(m => m.medium === 'air').length, 2);
  assert.equal(Object.keys(BLOOM_PARTS).length, 10);
  assert.equal(new Set(BLOOM_MODELS.map(m => m.id)).size, 14);
  const signature = g =>
      JSON.stringify({
        nodes: g.nodes,
        rig: g.rig,
        parts: g.parts.map(({ id, phase, ...p }) => p),
      }),
    old = new Set(
      PRESET_MODELS.filter(m => m.collection !== 'bloom').map(m => signature(preset(m.id))),
    );
  const fresh = BLOOM_MODELS.map(m => signature(preset(m.id)));
  assert.equal(new Set(fresh).size, 14);
  assert.ok(fresh.every(x => !old.has(x)));
});
for (const type of Object.keys(BLOOM_PARTS))
  for (const variant of [0, 1, 2])
    test(`${type}/${variant}: finite generated buffers, immutable rest, repeatable seek and reuse`, () => {
      const p = gene(type, variant)[0],
        plan = compileTidalPart(p),
        before = plan.components.map(c => digest(c.positions));
      assert.equal(plan.version, type === 'faceplate' ? 1 : 2);
      assert.ok(plan.components.length <= 6);
      const out = sampleTidalPart(plan, 0.273, animation),
        saved = out.map(c => c.positions.slice());
      for (const c of out) {
        finite(c.positions);
        finite(c.normals);
        assert.ok(c.indices.length > 0);
        assert.equal(c.uvs.length, (c.positions.length / 3) * 2);
        assert.ok(c.indices.every(i => i < c.positions.length / 3));
      }
      const reused = sampleTidalPart(plan, 1.317, animation, out);
      assert.equal(reused[0].positions, out[0].positions);
      sampleTidalPart(plan, 0.273, animation, reused);
      out.forEach((c, i) => assert.deepEqual(c.positions, saved[i]));
      assert.deepEqual(
        plan.components.map(c => digest(c.positions)),
        before,
      );
      for (const c of plan.components.filter(c => c.segments)) {
        assert.equal(
          c.segments.reduce((sum, s) => sum + s.count, 0),
          c.positions.length,
        );
        let end = 0;
        for (const s of c.segments) {
          assert.equal(s.start, end);
          end += s.count;
        }
      }
    });
for (const type of Object.keys(BLOOM_PARTS))
  test(type + ': three different shapes, bilateral symmetry, and static zero flex', () => {
    assert.equal(
      new Set(
        [0, 1, 2].map(v =>
          compileTidalPart(gene(type, v)[0])
            .components.map(c => digest(c.positions))
            .join('-'),
        ),
      ).size,
      3,
    );
    const pair = gene(type, 1, true);
    assert.equal(pair.length, 2);
    for (const time of [0, 0.13, 0.45, 1.07]) {
      const samples = pair.map(p => sampleTidalPart(compileTidalPart(p), time, animation));
      for (let c = 0; c < samples[0].length; c++)
        for (let i = 0; i < samples[0][c].positions.length - 2; i += 159) {
          const a = placeTidalPoint(samples[0][c].positions.subarray(i, i + 3), pair[0]),
            b = placeTidalPoint(samples[1][c].positions.subarray(i, i + 3), pair[1]);
          near(a[0], -b[0]);
          near(a[1], b[1]);
          near(a[2], b[2]);
        }
    }
    const plan = compileTidalPart({ ...pair[0], flex: 0 }),
      a = sampleTidalPart(plan, 0, animation),
      b = sampleTidalPart(plan, 3.11, animation);
    a.forEach((m, i) => assert.deepEqual(m.positions, b[i].positions));
  });
for (const { id, medium, family } of BLOOM_MODELS)
  test(
    id + ': complete visible parts, actual frame changes, portable recipes, and seeded variation',
    () => {
      const g = preset(id, 815),
        saved = serializeGenome(g),
        compiler = new FoundationCompiler(g),
        a = compiler.sample({ pose: 'motion-cycle', phase: 0.13 }),
        b = compiler.sample({ pose: 'motion-cycle', phase: 0.39 });
      assert.equal(g.motion.travel.medium, medium);
      assert.equal(g.rig.family, family || 'creature');
      assert.equal(a.excludedGenes, 0);
      assert.equal(b.excludedGenes, 0);
      assert.equal(a.meshes.length, b.meshes.length);
      let diff = 0;
      a.meshes.forEach((m, i) => {
        finite(m.positions);
        finite(m.normals);
        for (let j = 0; j < m.positions.length; j += 111)
          diff += Math.abs(m.positions[j] - b.meshes[i].positions[j]);
      });
      assert.ok(diff > 0.01);
      const audit = auditSnapshot(a);
      assert.notEqual(audit.technicalStatus, 'fail');
      assert.equal(audit.visualStatus, 'not-reviewed');
      const image = rasterize(a, {
        width: 128,
        height: 128,
        view: family ? 'quarter' : 'flight',
        frame: fitFrame([a, b]),
        shading: 'pattern',
      });
      assert.equal(image.clipped, 0);
      assert.ok(image.mask.reduce((s, x) => s + x, 0) > 90);
      assert.equal(serializeGenome(g), saved);
      assert.deepEqual(parseGenome(saved), g);
      assert.equal(actorManifest(g).contract.travel.medium, medium);
      const roster = generateActorBatch(g, { seed: 18, count: 3, variation: 0.5 });
      assert.deepEqual(parseActorRoster(JSON.stringify(roster)), roster);
      for (const actor of roster.actors) validateGenome(actor.blueprint);
      for (const seed of [0, 123, 4294967295]) validateGenome(mutate(g, seed));
    },
  );
for (const id of Object.keys(BLOOM_MOTION))
  test(id + ': all channels finite and unsupported humanoid motion reported', () => {
    const g = preset('bloomkite');
    g.motion = defaultMotion(id);
    const pose = sampleMotion(g.motion);
    Object.values(pose)
      .filter(v => typeof v === 'number')
      .forEach(v => assert.ok(Number.isFinite(v)));
    const h = preset('apiarist');
    h.motion = defaultMotion(id);
    assert.ok(analyze(h).warnings.some(n => n.includes(id)));
  });
for (const name of BLOOM_PATTERNS)
  test(name + ': CPU pigment bounded, repeatable, and spatially varying', () => {
    assert.ok(PATTERNS.includes(name));
    let lo = 1,
      hi = 0;
    for (let i = 0; i < 800; i++) {
      const p = [i * 0.057, Math.sin(i) * 2, i * 0.131],
        v = reviewPattern(name, p, 0.3);
      assert.equal(v, reviewPattern(name, p, 0.3));
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 1);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    assert.ok(hi - lo > 0.2);
  });
for (const name of BLOOM_MICRO)
  test(name + ': exact deterministic height map and opaque alpha', () => {
    assert.ok(MICRO_SURFACES.includes(name));
    const a = generateMicroTexture(811, name, 64);
    assert.deepEqual(a, generateMicroTexture(811, name, 64));
    assert.ok(new Set(a).size > 8);
    for (let i = 3; i < a.length; i += 4) assert.equal(a[i], 255);
  });
test('all new materials validate; distinct height fields and pigment masks', () => {
  for (const [name, s] of Object.entries(BLOOM_SURFACES)) {
    assert.equal(SURFACE_PRESETS[name], s);
    const g = preset('apiarist');
    Object.assign(g.appearance, s);
    validateGenome(g);
  }
  assert.equal(new Set(BLOOM_MICRO.map(m => digest(generateMicroTexture(6, m, 64)))).size, 6);
  const hashes = BLOOM_PATTERNS.map(m =>
    Array.from({ length: 400 }, (_, i) =>
      reviewPattern(m, [i * 0.057, Math.sin(i) * 2, i * 0.131], 0.3).toFixed(4),
    ).join(','),
  );
  assert.equal(new Set(hashes).size, 8);
});
for (const [id, def] of Object.entries(BLOOM_ACTIONS))
  test(id + ': finite action samples, masks, zero weight, and seek-safe event cues', () => {
    const config = { ...defaultHumanoidMotion(), action: id, repeat: false };
    for (let i = 0; i <= 24; i++) {
      const p = sampleHumanoidAction(config, (i / 24) * def.duration);
      finite(p.pelvisOffset);
      Object.values(p.rotations).forEach(finite);
      assert.deepEqual(p, sampleHumanoidAction(config, (i / 24) * def.duration));
    }
    const upper = sampleHumanoidAction({ ...config, mask: 'upper' }, def.duration * 0.55);
    assert.ok(!Object.keys(upper.rotations).some(n => /^(pelvis|upperLeg|shin|foot)/.test(n)));
    assert.deepEqual(upper.pelvisOffset, [0, 0, 0]);
    assert.equal(
      sampleHumanoidAction({ ...config, actionWeight: 0 }, def.duration * 0.5).weight,
      0,
    );
    const events = [];
    for (let i = 0; i < 600; i++)
      events.push(...collectActionEvents(config, i / 120, (i + 1) / 120));
    assert.equal(events.length, def.events.length);
    assert.equal(collectActionEvents(config, 0, 5, { seek: true }).length, 0);
  });
for (const id of Object.keys(BLOOM_KITS))
  test(id + ': kit is atomic, immutable, capacity checked, and one undo transaction', () => {
    const g = preset('apiarist'),
      before = serializeGenome(g),
      result = applyPartKit(g, id),
      s = new GenomeStore(g);
    s.replace(result.genome, 'Kit');
    assert.equal(s.past.length, 1);
    s.undo();
    assert.deepEqual(s.state, g);
    s.redo();
    assert.deepEqual(s.state, result.genome);
    assert.equal(serializeGenome(g), before);
    const full = structuredClone(g);
    while (full.parts.length < 32) full.parts.push(createPart(full, 'faceplate'));
    const state = JSON.stringify(full);
    assert.throws(() => applyPartKit(full, id), /32/);
    assert.equal(JSON.stringify(full), state);
  });
for (const layout of ['ring', 'fan', 'row'])
  test(
    layout + ': arrays keep source data, unique IDs, independent phases, and a single undo',
    () => {
      const g = source(),
        part = g.parts[0];
      part.material = 'metal';
      part.phase = 0.9;
      const before = serializeGenome(g),
        r = applyPartArray(g, part.id, { layout, count: 4, spacing: 0.15, phaseStep: 0.2 }),
        s = new GenomeStore(g);
      assert.equal(serializeGenome(g), before);
      assert.equal(r.added.length, 3);
      assert.equal(new Set(r.genome.parts.map(p => p.id)).size, 4);
      assert.deepEqual(r.genome.parts[0], part);
      r.genome.parts.forEach((p, i) => {
        assert.equal(p.material, 'metal');
        near(p.phase, (0.9 + i * 0.2) % 1);
      });
      s.replace(r.genome, 'Array');
      assert.equal(s.past.length, 1);
      s.undo();
      assert.deepEqual(s.state, g);
      s.redo();
      assert.deepEqual(s.state, r.genome);
      r.genome.parts[1].size = 1.7;
      assert.notEqual(r.genome.parts[0].size, r.genome.parts[1].size);
      assert.deepEqual(parseGenome(serializeGenome(r.genome)), r.genome);
    },
  );
test('arrays reject invalid requests before changing the source', () => {
  const g = source(),
    before = JSON.stringify(g),
    id = g.parts[0].id;
  for (const cfg of [
    { count: 1 },
    { count: 9 },
    { count: 3.2 },
    { layout: 'random' },
    { axis: 'w' },
    { span: Infinity },
    { phaseStep: -0.1 },
    { spacing: 0 },
    { layout: 'row', count: 8, spacing: 0.6 },
    [],
    null,
  ])
    assert.throws(() => applyPartArray(g, id, cfg));
  assert.equal(JSON.stringify(g), before);
  assert.throws(() => applyPartArray(g, 'missing'));
  const full = structuredClone(g);
  while (full.parts.length < 32) full.parts.push(createPart(full, 'trunk'));
  assert.throws(() => applyPartArray(full, id), /32/);
  const mirror = structuredClone(g);
  mirror.parts[0].mirror = true;
  assert.throws(() => applyPartArray(mirror, id, { layout: 'ring' }), /Mirror/);
  validateGenome(applyPartArray(mirror, id, { layout: 'row' }).genome);
  const pole = structuredClone(g);
  pole.parts[0].anchor = [0, 1, 0];
  assert.throws(() => applyPartArray(pole, id), /axis/);
});
test('joint arrays keep a selected hand with rows and explicitly reject side-changing rings', () => {
  const g = source('trunk', 'hand');
  assert.throws(() => applyPartArray(g, g.parts[0].id), /paired joint/);
  const result = applyPartArray(g, g.parts[0].id, { layout: 'row', count: 3 });
  assert.ok(result.genome.parts.every(p => p.socket === 'hand' && p.anchor[0] > 0));
  const head = source('faceplate', 'head');
  validateGenome(applyPartArray(head, head.parts[0].id, { count: 3 }).genome);
});
test('ring anchor directions close after a full revolution and rows use local offsets', () => {
  const g = source(),
    result = applyPartArray(g, g.parts[0].id, { count: 4 });
  const a = result.genome.parts[0].anchor,
    b = result.genome.parts[2].anchor;
  near(a[0], -b[0]);
  near(a[1], b[1]);
  near(a[2], -b[2]);
  const row = applyPartArray(g, g.parts[0].id, {
    layout: 'row',
    axis: 'z',
    count: 4,
    spacing: 0.2,
  });
  row.genome.parts.forEach((p, i) => {
    near(p.socketOffset[2], i * 0.2);
    assert.deepEqual(p.anchor, g.parts[0].anchor);
  });
});
test('leg bank IK preserves both segment lengths at all sampled phases', () => {
  const p = gene('legbank', 2)[0],
    plan = compileTidalPart(p);
  for (const c of plan.components)
    for (const s of c.segments)
      if (s.behavior?.mode === 'leg')
        for (const time of [0, 0.1, 0.4, 0.8, 1.3]) {
          const q = prepareBloomMotion(s.behavior, p, time, animation),
            length = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
          near(length(q.a, q.b), length(q.c, q.d));
        }
});
test('curved trunk cross sections do not shear with the centerline bend', () => {
  const p = { ...gene('trunk', 2)[0], phase: 0 },
    plan = compileTidalPart(p),
    compiler = new FoundationCompiler(preset('bristleskate'));
  for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
    const a = auditSnapshot(compiler.sample({ pose: 'motion-cycle', phase }));
    assert.equal(a.checks.find(x => x.key === 'stretch').status, 'pass');
  }
  assert.ok(
    sampleTidalPart(plan, 0.36, animation).some(
      (c, i) => digest(c.positions) !== digest(plan.components[i].positions),
    ),
  );
});
test('ground rest-foot clearance changes only downward shared supports, not water or humanoid rigs', () => {
  for (const id of ['pebbleroller', 'mossstrider', 'crowngrazer', 'duneauger']) {
    const g = preset(id),
      a = analyze(g);
    assert.ok(a.visualSupportPoints > 0);
    for (const p of a.parts.filter(p => p.normal[1] < -0.05))
      for (const q of bloomSupportPoints(p))
        assert.ok(placeTidalPoint(q, p)[1] + a.restHeight >= 0.12 * p.size + 0.029);
  }
  const water = preset('clapshell');
  assert.equal(analyze(water).visualSupportPoints, 0);
  const h = preset('apiarist'),
    base = analyze(h).restHeight;
  h.parts = [];
  assert.equal(analyze(h).restHeight, base);
});
test('humanoid shared part sampling follows the selected bone and uses the same local plan', () => {
  const g = source('faceplate', 'head'),
    c = new FoundationCompiler(g),
    s = c.sample({ pose: 'reach', phase: 0.4 }),
    p = c.analysis.parts[0],
    plan = c.tidalPlans[0].plan,
    frame = sampleTidalPart(plan, 0, sampleMotion(g.motion)),
    bones = sampleFoundationBones(g.rig, 'reach', 0.4, g.motion),
    name = p.socket === 'body' ? hostBone(p.host) : socketBone(p.socket, p.side);
  const mesh = s.meshes.find(m => m.name.includes(p.indexKey));
  assert.ok(mesh, 'Named joint-mounted part mesh is exposed.');
  const expected = transform(
    bones.world[name],
    placeTidalPoint(frame[0].positions.slice(0, 3), p).map((x, i) => x - bones.restLocal[name][i]),
  );
  expected.forEach((x, i) => near(x, mesh.positions[i]));
  assert.equal(s.excludedGenes, 0);
  assert.equal(c.sample({ details: false }).excludedGenes, 1);
  g.parts.push(createPart(g, 'horn'));
  assert.equal(new FoundationCompiler(g).sample().excludedGenes, 0);
});
test('humanoid unsupported base clips do not drive the diagnostic legs', () => {
  const h = preset('apiarist');
  h.motion = defaultMotion('ripplewalk');
  const sampled = sampleFoundationBones(h.rig, 'motion-cycle', 0.3, h.motion);
  const zero = sampleFoundationBones(h.rig, 'motion-cycle', 0.3, defaultMotion('idle'));
  assert.deepEqual(sampled.world['upperLeg.L'], zero.world['upperLeg.L']);
});
test('new-old cross-medium mixes, source locks, and review sessions remain portable', () => {
  for (const [aId, bId] of [
    ['apiarist', 'wayfarer'],
    ['clapshell', 'salpchain'],
    ['bloomkite', 'shrinesentinel'],
    ['duneauger', 'hoopglider'],
  ]) {
    const a = preset(aId),
      b = preset(bId),
      before = serializeGenome(a);
    for (const t of [0, 0.35, 0.5, 0.75, 1]) {
      validateGenome(mixGenomes(a, b, all(t)).genome);
      const r = createMixRecipe(a, b, all(t));
      assert.deepEqual(parseMixRecipe(JSON.stringify(r)), r);
    }
    const settings = all(0.6);
    settings.locks.parts = true;
    settings.locks.body = true;
    assert.deepEqual(mixGenomes(a, b, settings, a).genome.parts, a.parts);
    assert.equal(serializeGenome(a), before);
    const session = new ReviewSession(a);
    session.settings.pose = 'motion-cycle';
    session.settings.phase = 0.3;
    session.notes = 'Inspect array clearance.';
    assert.deepEqual(
      parseReviewSession(JSON.stringify(session.export())).export(),
      session.export(),
    );
  }
});

test('humanoid review phase covers the full action and reports time in seconds', () => {
  const g = preset('apiarist');
  g.motion.humanoid = { ...defaultHumanoidMotion(), action: 'overhead', actionSpeed: 2 };
  near(motionCycleTime(g.motion, 0.9, true), 1.26);
  near(motionCycleTime(g.motion, 0.9, false), 1.8);
  const s = new FoundationCompiler(g).sample({ pose: 'motion-cycle', phase: 0.9 });
  near(s.sampleTimeSeconds, 1.26);
  near(auditSnapshot(s).timeSeconds, 1.26);
  g.motion.humanoid.action = 'none';
  near(motionCycleTime(g.motion, 0.9, true), 1.8);
  assert.equal(auditSnapshot(new FoundationCompiler(g).sample({ pose: 'bind' })).timeSeconds, null);
});

test('sentinel chest plate band does not cover its mask in the rest pose', () => {
  const c = new FoundationCompiler(preset('shrinesentinel')),
    s = c.sample({ pose: 'bind' }),
    plate = s.meshes.filter(m => m.name.includes('/plateband/')),
    mask = s.meshes.filter(m => m.name.includes('/faceplate/'));
  const ys = meshes => meshes.flatMap(m => Array.from(m.positions).filter((_, i) => i % 3 === 1));
  assert.ok(Math.max(...ys(plate)) < Math.min(...ys(mask)) - 0.05);
});
