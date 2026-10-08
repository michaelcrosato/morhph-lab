import { compilePacking, packMeshes, packingReport } from './packing.js';
/** Portable asset delivery from the validated CPU foundation compiler.
 * Export does not edit a blueprint, apply physics, or claim GPU shader parity.
 */
import { validateGenome } from '../core/genome.js';
import { SHARED_PARTS } from '../core/shared-parts.js';
import { FoundationCompiler, REVIEW_POSES, motionCycleTime } from '../review/foundation.js';
import { auditSnapshot, TARGETS, fingerprint, stableStringify } from '../review/audit.js';
import { sampleReviewPigment } from '../review/pigment.js';
import { GLBWriter, readDeliveryGLB, deliveryPose } from './glb.js';
import { sha256, archive, safeAssetName } from './archive.js';
export const DELIVERY_LIMITS = Object.freeze({
  bytes: 64 * 1024 * 1024,
  vertices: 200000,
  triangles: 300000,
  meshes: 256,
  frames: 33,
});
export const DELIVERY_NOTES = Object.freeze([
  'Geometry comes from the offline Inspector, not a capture of the WebGL2 Workshop.',
  'Materials use linear vertex colors and standard metallic/roughness values. Fine pattern detail, bump textures, and custom shaders are not exported.',
  'Motion is a sampled vertex bake. It has no reusable skeleton, retargeting, root-motion track, terrain contact, or physical collision data.',
  'No loop is forced. Play once by default; inspect the reported endpoint gap before looping.',
  'The source blueprint is the editable asset. Regenerate after changing proportions, parts, or actions.',
  'Technical checks do not approve self-intersections, equipment fit, anatomy, or production quality.',
]);
export function deliveryEligibility(raw) {
  const g = validateGenome(raw),
    missing = g.parts.filter(p => !Object.hasOwn(SHARED_PARTS, p.type));
  return {
    eligible: missing.length === 0,
    sourceFingerprint: fingerprint(g),
    unsupportedGenes: missing.map(p => ({ id: p.id, type: p.type })),
    unsupportedFamilies: [...new Set(missing.map(p => p.type))],
    totalGenes: g.parts.length,
  };
}
export function deliveryOptions(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Export settings must be an object.');
  const known = [
    'mode',
    'pose',
    'phase',
    'frames',
    'start',
    'end',
    'target',
    'pigment',
    'acknowledgeWarnings',
    'meshLayout',
  ];
  if (Object.keys(raw).some(k => !known.includes(k))) throw new Error('Unknown export setting.');
  const o = {
    meshLayout: raw.meshLayout ?? 'separate',
    mode: raw.mode ?? 'static',
    pose: raw.pose ?? 'bind',
    phase: raw.phase ?? 0.5,
    frames: raw.frames ?? 9,
    start: raw.start ?? 0,
    end: raw.end ?? 1,
    target: raw.target ?? 'desktop',
    pigment: raw.pigment ?? true,
    acknowledgeWarnings: raw.acknowledgeWarnings ?? false,
  };
  if (!['separate', 'material'].includes(o.meshLayout))
    throw new Error('Unknown export mesh layout.');
  if (
    !['static', 'motion'].includes(o.mode) ||
    !REVIEW_POSES.includes(o.pose) ||
    !Object.hasOwn(TARGETS, o.target)
  )
    throw new Error('Unknown export mode, pose, or budget.');
  if (!Number.isInteger(o.frames) || o.frames < 3 || o.frames > DELIVERY_LIMITS.frames)
    throw new Error('Use 3–33 motion samples.');
  for (const k of ['phase', 'start', 'end'])
    if (typeof o[k] !== 'number' || !Number.isFinite(o[k]) || o[k] < 0 || o[k] > 1)
      throw new Error('Export phase must be between zero and one.');
  if (o.end <= o.start) throw new Error('End phase must be greater than start phase.');
  if (typeof o.pigment !== 'boolean' || typeof o.acknowledgeWarnings !== 'boolean')
    throw new Error('Export toggles must be boolean.');
  return o;
}
const linear = v => {
  v = Math.max(0, Math.min(1, v / 255));
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const standardMaterial = (name, a) => {
  const roughness =
    {
      cloth: 0.95,
      bone: 0.58,
      metal: Math.max(0.23, a.roughness * 0.6),
      eye: 0.22,
      iris: 0.28,
      pupil: 0.16,
      dark: 0.3,
      glint: 1,
      armor: Math.max(0.2, a.roughness * 0.76),
    }[name] ?? a.roughness;
  const metalness =
    {
      metal: 0.85,
      iris: 0.08,
      armor: Math.min(1, a.metalness + 0.12),
      cloth: 0,
      bone: 0,
      eye: 0,
      pupil: 0,
      dark: 0,
      glint: 0,
    }[name] ?? (name === 'skin' ? a.metalness : a.metalness * 0.5);
  const m = {
    name: 'Morph / ' + name,
    pbrMetallicRoughness: {
      baseColorFactor: [1, 1, 1, 1],
      metallicFactor: metalness,
      roughnessFactor: roughness,
    },
    doubleSided: true,
  };
  const strength =
    name === 'glint'
      ? 1
      : name === 'glow'
        ? Math.min(1, 0.35 + a.emission)
        : name === 'skin'
          ? a.emission * 0.24
          : ['accent', 'membrane'].includes(name)
            ? a.emission * 0.2
            : 0;
  if (strength) {
    const color =
      name === 'glint'
        ? [255, 255, 255]
        : [1, 3, 5].map(i => parseInt(a.accent.slice(i, i + 2), 16));
    m.emissiveFactor = color.map(v => linear(v) * Math.min(1, strength));
  }
  return m;
};
function normals(data) {
  const out = new Float32Array(data);
  for (let i = 0; i < out.length; i += 3) {
    const n = Math.hypot(out[i], out[i + 1], out[i + 2]);
    if (!Number.isFinite(n) || n < 1e-12) throw new Error('A mesh has an invalid normal.');
    out[i] /= n;
    out[i + 1] /= n;
    out[i + 2] /= n;
  }
  return out;
}
function colors(mesh, appearance, pigment) {
  if (mesh.vertexColors) return mesh.vertexColors;
  const out = new Float32Array(mesh.positions.length),
    points = mesh.pigmentPositions || mesh.restPositions || mesh.positions,
    base = mesh.color || [180, 180, 180];
  for (let i = 0; i < out.length; i += 3) {
    const c =
      pigment && ['skin', 'membrane'].includes(mesh.material)
        ? sampleReviewPigment(appearance, points.subarray(i, i + 3), base)
        : base;
    out.set(c.map(linear), i);
  }
  return out;
}
function assertSample(s, first = null) {
  if (s.excludedGenes)
    throw new Error(
      'Export blocked: Inspector would omit attachment genes. Export the blueprint instead.',
    );
  if (!s.meshes.length || s.meshes.length > DELIVERY_LIMITS.meshes)
    throw new Error('Export mesh-count limit exceeded.');
  let vertices = 0,
    triangles = 0;
  const names = new Set();
  if (first && s.meshes.length !== first.meshes.length)
    throw new Error('Animation topology changed: mesh count.');
  for (const [j, m] of s.meshes.entries()) {
    if (!m.name || names.has(m.name)) throw new Error('Mesh names must be stable and unique.');
    names.add(m.name);
    if (
      !m.positions.length ||
      m.positions.length % 3 ||
      m.normals.length !== m.positions.length ||
      m.indices.length % 3 ||
      !m.indices.length
    )
      throw new Error('Invalid mesh array shape.');
    for (const a of [m.positions, m.normals])
      for (const x of a) if (!Number.isFinite(x)) throw new Error('Non-finite mesh data.');
    const n = m.positions.length / 3;
    for (const i of m.indices)
      if (!Number.isInteger(i) || i < 0 || i >= n) throw new Error('Invalid mesh index.');
    vertices += n;
    triangles += m.indices.length / 3;
    if (first) {
      const b = first.meshes[j];
      if (
        m.name !== b.name ||
        m.material !== b.material ||
        m.positions.length !== b.positions.length ||
        m.indices.length !== b.indices.length
      )
        throw new Error('Animation topology changed.');
      for (let k = 0; k < m.indices.length; k++)
        if (m.indices[k] !== b.indices[k]) throw new Error('Animation index order changed.');
    }
  }
  if (vertices > DELIVERY_LIMITS.vertices || triangles > DELIVERY_LIMITS.triangles)
    throw new Error('Geometry exceeds the export safety budget. Remove parts before exporting.');
  return { vertices, triangles, meshes: s.meshes.length };
}
function summary(a) {
  return {
    sourceTotals: a.sourceTotals,
    pose: a.pose,
    phase: a.phase,
    timeSeconds: a.timeSeconds,
    technicalStatus: a.technicalStatus,
    totals: a.totals,
    checks: a.checks,
  };
}
function auditCheck(a, o) {
  if (a.technicalStatus === 'fail') throw new Error('Export blocked by failed geometry checks.');
  if (a.technicalStatus === 'warning' && !o.acknowledgeWarnings)
    throw new Error(
      'Export has technical warnings. Inspect the audit, then acknowledge warnings to export.',
    );
}
function cancellation(signal) {
  if (signal?.aborted) {
    const error = new Error('Export cancelled. No asset was written.');
    error.name = 'AbortError';
    throw error;
  }
}
const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));
/** Cooperative job: yields before construction, between samples and mesh writes.
 * Cancellation is checked at these boundaries; one mesh compile is synchronous. */
export async function buildDelivery(raw, settings = {}, hooks = {}) {
  const genome = validateGenome(raw),
    o = deliveryOptions(settings),
    eligible = deliveryEligibility(genome),
    { signal, onProgress = () => {} } = hooks;
  if (!eligible.eligible)
    throw new Error(
      'Export blocked. Unsupported Inspector families: ' +
        eligible.unsupportedFamilies.join(', ') +
        '. No parts were removed.',
    );
  const progress = async (stage, completed, total) => {
    cancellation(signal);
    onProgress({ stage, completed, total });
    await yieldTask();
    cancellation(signal);
  };
  await progress('Compile source', 0, 1);
  const compiler = new FoundationCompiler(genome),
    sampleOptions = {
      pose: o.mode === 'motion' ? 'motion-cycle' : o.pose,
      phase: o.mode === 'motion' ? o.start : o.phase,
      garment: true,
      details: true,
    };
  const sourceBase = compiler.sample(sampleOptions);
  assertSample(sourceBase);
  const layout = compilePacking(sourceBase.meshes, o.meshLayout),
    packing = packingReport(layout);
  const prepare = s => ({
    ...s,
    meshes: packMeshes(layout, s.meshes, m => colors(m, genome.appearance, o.pigment)),
  });
  const auditSource = s => {
    const a = auditSnapshot(s, o.target),
      meshCheck = a.checks.find(c => c.key === 'meshes');
    a.sourceTotals = { ...a.totals };
    a.totals.meshes = layout.batches.length;
    meshCheck.value = layout.batches.length;
    meshCheck.status = meshCheck.value > meshCheck.limit ? 'warning' : 'pass';
    a.technicalStatus = a.checks.some(c => c.status === 'fail')
      ? 'fail'
      : a.checks.some(c => c.status === 'warning')
        ? 'warning'
        : 'pass';
    return a;
  };
  const base = prepare(sourceBase),
    totals = assertSample(base),
    a = auditSource(sourceBase);
  auditCheck(a, o);
  const frameCount = o.mode === 'motion' ? o.frames : 1,
    estimatedBytes =
      totals.vertices * (36 + 24 * (frameCount - 1)) + totals.triangles * 12 + 1024 * 1024;
  if (estimatedBytes > DELIVERY_LIMITS.bytes)
    throw new Error(
      `Estimated bake is ${(estimatedBytes / 1048576).toFixed(1)} MiB. Use fewer motion samples (limit: 64 MiB).`,
    );
  const writer = new GLBWriter(genome.name),
    J = writer.json,
    matMap = new Map(),
    runtime = [],
    audits = [summary(a)],
    allBounds = structuredClone(base.bounds);
  const sourceText = JSON.stringify(genome, null, 2) + '\n',
    sourceHash = sha256(sourceText),
    configHash = sha256(stableStringify(o)),
    poseCount = frameCount;
  J.asset.extras = {
    sourceSHA256: sourceHash,
    sourceFingerprint: eligible.sourceFingerprint,
    blueprintSchema: genome.version,
    exportMode: o.mode,
    geometryBackend: 'foundation-cpu',
    units: 'metres',
    upAxis: '+Y',
    forwardAxis: '+Z',
    skeletonExported: false,
  };
  for (let i = 0; i < base.meshes.length; i++) {
    await progress('Write mesh', i, base.meshes.length);
    const m = base.meshes[i],
      n = normals(m.normals),
      v = m.positions.length / 3;
    if (!matMap.has(m.material))
      matMap.set(m.material, J.materials.push(standardMaterial(m.material, genome.appearance)) - 1);
    const ids = v < 65535 ? new Uint16Array(m.indices) : new Uint32Array(m.indices),
      p = {
        attributes: {
          POSITION: writer.accessor(m.positions, 'VEC3', { target: 34962, bounds: true }),
          NORMAL: writer.accessor(n, 'VEC3', { target: 34962 }),
          COLOR_0: writer.accessor(colors(m, genome.appearance, o.pigment), 'VEC3', {
            target: 34962,
          }),
        },
        indices: writer.accessor(ids, 'SCALAR', { target: 34963 }),
        material: matMap.get(m.material),
        mode: 4,
      };
    const meshIndex = J.meshes.push({ name: m.name, primitives: [p] }) - 1,
      node =
        J.nodes.push({
          name: m.name,
          mesh: meshIndex,
          extras: { sourceMesh: m.name, materialClass: m.material, sourceRanges: m.sourceRanges },
        }) - 1;
    J.nodes[0].children.push(node);
    runtime.push({ p, node, normals: n, dynamic: false });
  }
  let maxEndpointGap = 0,
    duration = 0;
  if (o.mode === 'motion') {
    duration =
      motionCycleTime(genome.motion, o.end, compiler.human) -
      motionCycleTime(genome.motion, o.start, compiler.human);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid motion duration.');
    for (let fi = 1; fi < poseCount; fi++) {
      await progress('Sample motion', fi, poseCount);
      const phase = o.start + ((o.end - o.start) * fi) / (poseCount - 1),
        source = compiler.sample({ ...sampleOptions, phase });
      assertSample(source, sourceBase);
      const s = prepare(source);
      assertSample(s, base);
      const audit = auditSource(source);
      auditCheck(audit, o);
      audits.push(summary(audit));
      for (let k = 0; k < 3; k++) {
        allBounds.min[k] = Math.min(allBounds.min[k], s.bounds.min[k]);
        allBounds.max[k] = Math.max(allBounds.max[k], s.bounds.max[k]);
      }
      for (let mi = 0; mi < runtime.length; mi++) {
        const r = runtime[mi],
          m = s.meshes[mi],
          rest = base.meshes[mi],
          normal = normals(m.normals),
          dp = new Float32Array(m.positions.length),
          dn = new Float32Array(dp.length);
        for (let k = 0; k < dp.length; k++) {
          dp[k] = m.positions[k] - rest.positions[k];
          dn[k] = normal[k] - r.normals[k];
          if (Math.abs(dp[k]) > 1e-7 || Math.abs(dn[k]) > 1e-7) r.dynamic = true;
        }
        if (fi === poseCount - 1)
          for (let k = 0; k < dp.length; k += 3)
            maxEndpointGap = Math.max(maxEndpointGap, Math.hypot(dp[k], dp[k + 1], dp[k + 2]));
        (r.p.targets ??= []).push({
          POSITION: writer.accessor(dp, 'VEC3', { target: 34962, bounds: true }),
          NORMAL: writer.accessor(dn, 'VEC3', { target: 34962 }),
        });
      }
    }
    const times = Float32Array.from(
        { length: poseCount },
        (_, i) => (duration * i) / (poseCount - 1),
      ),
      weights = new Float32Array(poseCount * (poseCount - 1));
    for (let i = 1; i < poseCount; i++) weights[i * (poseCount - 1) + i - 1] = 1;
    const input = writer.accessor(times, 'SCALAR', { bounds: true }),
      output = writer.accessor(weights, 'SCALAR'),
      animation = {
        name:
          genome.rig.family === 'humanoid' && genome.motion.humanoid.action !== 'none'
            ? genome.motion.humanoid.action
            : 'procedural-motion',
        samplers: [{ input, output, interpolation: 'LINEAR' }],
        channels: [],
        extras: {
          sourceStartPhase: o.start,
          sourceEndPhase: o.end,
          recommendedPlayback: 'once',
          endpointGapMetres: maxEndpointGap,
        },
      };
    for (const r of runtime) {
      J.meshes[J.nodes[r.node].mesh].weights = Array(poseCount - 1).fill(0);
      animation.channels.push({ sampler: 0, target: { node: r.node, path: 'weights' } });
    }
    J.animations = [animation];
  }
  await progress('Check binary', 0, 1);
  const glb = writer.finish(DELIVERY_LIMITS.bytes),
    decoded = readDeliveryGLB(glb);
  let maxRoundTripError = 0;
  for (let fi = 0; fi < frameCount; fi++) {
    await progress('Check exported pose', fi, frameCount);
    const expected =
        fi === 0
          ? base
          : prepare(
              compiler.sample({
                ...sampleOptions,
                phase: o.start + ((o.end - o.start) * fi) / (frameCount - 1),
              }),
            ),
      actual = deliveryPose(decoded, frameCount === 1 ? 0 : (duration * fi) / (frameCount - 1));
    if (actual.length !== expected.meshes.length)
      throw new Error('GLB round-trip mesh count changed.');
    for (let i = 0; i < expected.meshes.length; i++)
      for (let k = 0; k < expected.meshes[i].positions.length; k++)
        maxRoundTripError = Math.max(
          maxRoundTripError,
          Math.abs(actual[i].positions[k] - expected.meshes[i].positions[k]),
        );
  }
  if (maxRoundTripError > 1e-5) throw new Error('GLB round-trip check failed.');
  const warnings = audits.flatMap((x, i) =>
    x.checks.filter(c => c.status === 'warning').map(c => ({ frame: i, phase: x.phase, ...c })),
  );
  const report = {
    format: 'morph-lab-delivery-audit',
    version: 1,
    sourceSHA256: sourceHash,
    options: o,
    totals,
    packing,
    inactiveGenes: sourceBase.inactiveGenes || [],
    coverage: eligible,
    frames: audits,
    bounds: allBounds,
    warningCount: warnings.length,
    warnings,
    technicalStatus: warnings.length ? 'warning' : 'pass',
    visualStatus: 'not-approved',
    internalGLBRoundTrip: {
      checked: true,
      checkedSamples: frameCount,
      maxPositionError: maxRoundTripError,
    },
    externalValidator: 'not run by this export',
    gpuVerified: false,
    physicsVerified: false,
  };
  const manifest = {
    format: 'morph-lab-asset-delivery',
    version: 1,
    applicationVersion: '11.0.0',
    name: genome.name,
    sourceFingerprint: eligible.sourceFingerprint,
    sourceSHA256: sourceHash,
    settingsSHA256: configHash,
    settings: o,
    packing,
    inactiveGenes: sourceBase.inactiveGenes || [],
    coordinates: {
      handedness: 'right',
      up: '+Y',
      forward: '+Z',
      units: 'metres',
      origin: 'Original compiler origin; no recentering',
    },
    totals,
    bounds: allBounds,
    geometry: {
      format: 'glTF 2.0 binary',
      backend: 'foundation-cpu',
      allActiveGenesIncluded: true,
      allGenesIncluded: !sourceBase.inactiveGenes?.length,
      garmentAndDetailsIncluded: true,
      skinOrSkeleton: false,
    },
    animation:
      o.mode === 'motion'
        ? {
            name: J.animations[0].name,
            method: 'sampled POSITION and NORMAL morph targets',
            samples: poseCount,
            targetsPerMesh: poseCount - 1,
            durationSeconds: duration,
            interpolation: 'LINEAR',
            recommendedPlayback: 'once',
            endpointGapMetres: maxEndpointGap,
            loopClosed: maxEndpointGap < 0.00001,
          }
        : { method: 'static pose', pose: base.pose, phase: base.phase },
    materials: {
      method: o.pigment ? 'CPU pigment baked to linear vertex colors' : 'Flat linear vertex colors',
      texturesIncluded: false,
      customShadersIncluded: false,
      standardPBR: true,
    },
    actor: structuredClone(genome.actor),
    checks: {
      technicalStatus: report.technicalStatus,
      warningCount: warnings.length,
      warningsAcknowledged: o.acknowledgeWarnings,
      sourceUnchanged: true,
      visualApproval: false,
    },
    limitations: [...DELIVERY_NOTES],
    files: [],
  };
  const auditText = JSON.stringify(report, null, 2) + '\n',
    readme = `MORPH LAB 11 / COMPLETE COVERAGE\n\n${genome.name}\n\nOpen model.glb in a glTF 2.0 application. Enable vertex colors in your material importer.\nImport source.morph.json into Morph Lab to edit the recipe.\nRead manifest.json and audit.json before game integration.\n\n${DELIVERY_NOTES.join('\n')}\n\nNo engine packages, fonts, or external files are needed to load this GLB.\nNo shader, physics, or target-game approval is included.\n`;
  const files = [
    { name: 'model.glb', data: glb },
    { name: 'source.morph.json', data: sourceText },
    { name: 'audit.json', data: auditText },
    { name: 'README.txt', data: readme },
  ];
  await progress('Create package', 0, 1);
  for (const file of files) {
    const data = typeof file.data === 'string' ? new TextEncoder().encode(file.data) : file.data;
    manifest.files.push({ name: file.name, bytes: data.length, sha256: sha256(data) });
  }
  files.push({ name: 'manifest.json', data: JSON.stringify(manifest, null, 2) + '\n' });
  const zip = archive(files);
  cancellation(signal);
  onProgress({ stage: 'Complete', completed: 1, total: 1 });
  return { name: safeAssetName(genome.name), glb, zip, manifest, report };
}
