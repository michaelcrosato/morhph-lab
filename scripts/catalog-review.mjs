/** Engine-free geometry review of a model collection. No Three.js, Rapier, browser, or network.
 *
 *   node scripts/catalog-review.mjs                          audit all models at eight phases
 *   node scripts/catalog-review.mjs --collection bloom       one content pack
 *   node scripts/catalog-review.mjs --render                 also write a PNG per model and phase
 *   node scripts/catalog-review.mjs --out DIR                output folder
 *
 * Collections: all, tidal, frontier, bloom, field. Output defaults to
 * test-results/review/<collection>/ (report.json plus optional PNGs).
 * Each model is fitted separately; all phases of one model share a camera frame.
 * A technical pass is not an intersection, anatomy, or production approval.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRESET_MODELS } from '../src/core/presets.js';
import { TIDAL_MODELS } from '../src/core/tidal-catalog.js';
import { FRONTIER_MODELS } from '../src/core/frontier-catalog.js';
import { BLOOM_MODELS } from '../src/core/bloom-catalog.js';
import { FIELD_MODELS } from '../src/core/field-catalog.js';
import { preset } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { auditSnapshot, fingerprint } from '../src/review/audit.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
import { ROOT, APP_VERSION } from './project.mjs';

const COLLECTIONS = {
  all: PRESET_MODELS,
  tidal: TIDAL_MODELS,
  frontier: FRONTIER_MODELS,
  bloom: BLOOM_MODELS,
  field: FIELD_MODELS,
};
const PHASES = 8;
const SIZE = 512;

function option(name, fallback) {
  const at = process.argv.indexOf(name);
  if (at < 0) return fallback;
  const value = process.argv[at + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
  return value;
}

const collection = option('--collection', 'all');
const models = COLLECTIONS[collection];
if (!models)
  throw new Error(`Unknown collection ${collection}; use ${Object.keys(COLLECTIONS).join(', ')}.`);
const render = process.argv.includes('--render');
const out = path.resolve(option('--out', path.join(ROOT, 'test-results/review', collection)));
await mkdir(out, { recursive: true });

/** Swimmers and fliers read best from the flight view; walkers and humanoids from a quarter view. */
const viewFor = spec =>
  (spec.medium === 'water' || spec.medium === 'air') && spec.family !== 'humanoid'
    ? 'flight'
    : 'quarter';

const records = [];
for (const spec of models) {
  const blueprint = preset(spec.id),
    compiler = new FoundationCompiler(blueprint),
    snapshots = Array.from({ length: PHASES }, (_, i) =>
      compiler.sample({ pose: 'motion-cycle', phase: i / PHASES }),
    ),
    frame = fitFrame(snapshots),
    view = viewFor(spec),
    images = [];
  const poses = snapshots.map(snapshot => {
    const a = auditSnapshot(snapshot);
    return {
      phase: snapshot.phase,
      timeSeconds: snapshot.sampleTimeSeconds,
      technicalStatus: a.technicalStatus,
      visualStatus: a.visualStatus,
      totals: a.totals,
      bounds: a.bounds,
      checks: a.checks,
      excludedGenes: snapshot.excludedGenes,
      inactiveGenes: snapshot.inactiveGenes,
    };
  });
  if (render)
    for (const [i, snapshot] of snapshots.entries()) {
      const image = rasterize(snapshot, {
          width: SIZE,
          height: SIZE,
          view,
          frame,
          shading: 'pattern',
        }),
        file = `${spec.id}-${i}.png`;
      await writeFile(path.join(out, file), encodePNG(SIZE, SIZE, image.pixels));
      images.push({
        file,
        view,
        phase: snapshot.phase,
        clipped: image.clipped,
        maskPixels: image.mask.reduce((a, b) => a + b, 0),
      });
    }
  records.push({
    id: spec.id,
    label: spec.label,
    medium: spec.medium,
    note: spec.note,
    blueprintFingerprint: fingerprint(blueprint),
    frame,
    coverage: snapshots[0].coverage,
    poses,
    images,
  });
  console.log(`${spec.id}: ${poses.map(x => x.technicalStatus).join(', ')}`);
}

const poses = records.flatMap(r => r.poses),
  images = records.flatMap(r => r.images),
  counts = {
    models: records.length,
    samples: poses.length,
    pass: poses.filter(x => x.technicalStatus === 'pass').length,
    warning: poses.filter(x => x.technicalStatus === 'warning').length,
    fail: poses.filter(x => x.technicalStatus === 'fail').length,
    excludedGenes: poses.reduce((n, x) => n + x.excludedGenes, 0),
    images: images.length,
    clippedImages: images.filter(x => x.clipped).length,
  };
await writeFile(
  path.join(out, 'report.json'),
  JSON.stringify(
    {
      format: 'morph-lab-catalog-review',
      version: 1,
      appVersion: APP_VERSION,
      collection,
      createdAt: new Date().toISOString(),
      backend: 'foundation-cpu',
      counts,
      visualStatus: 'not-approved',
      gpuVerified: false,
      physicsVerified: false,
      note: 'Actual shared geometry at eight phases. Vertex pigment approximates the GPU shader. Technical pass is not intersection, anatomy, or production approval.',
      records,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(counts));
if (counts.fail) process.exitCode = 1;
