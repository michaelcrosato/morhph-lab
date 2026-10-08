/** Actual Strange Forms geometry review. No Three.js, Rapier, browser, or network.
 * npm run review:frontier              # audit all 12 models across eight frames
 * npm run review:frontier -- --render  # also render reproducible source evidence
 * Each model uses one camera frame across all eight time samples.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FRONTIER_MODELS } from '../src/core/frontier-catalog.js';
import { preset } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { auditSnapshot, fingerprint } from '../src/review/audit.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
const args = process.argv.slice(2),
  index = args.indexOf('--out');
if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith('--')))
  throw new Error('Missing --out directory.');
const out = path.resolve(
    index >= 0
      ? args[index + 1]
      : new URL('../test-results/v7-frontier-batch/', import.meta.url).pathname,
  ),
  render = args.includes('--render');
await mkdir(out, { recursive: true });
const records = [];
for (const spec of FRONTIER_MODELS) {
  const blueprint = preset(spec.id),
    compiler = new FoundationCompiler(blueprint),
    snapshots = Array.from({ length: 8 }, (_, i) =>
      compiler.sample({ pose: 'motion-cycle', phase: i / 8 }),
    ),
    frame = fitFrame(snapshots),
    views = [];
  const poses = snapshots.map((snapshot, i) => {
    const a = auditSnapshot(snapshot);
    return {
      phase: i / 8,
      timeSeconds: i / 4,
      technicalStatus: a.technicalStatus,
      visualStatus: a.visualStatus,
      totals: a.totals,
      bounds: a.bounds,
      checks: a.checks,
      excludedGenes: snapshot.excludedGenes,
    };
  });
  if (render)
    for (let i = 0; i < snapshots.length; i++) {
      const image = rasterize(snapshots[i], {
          width: 512,
          height: 512,
          view: 'flight',
          frame,
          shading: 'pattern',
        }),
        file = spec.id + '-' + i + '.png';
      await writeFile(path.join(out, file), encodePNG(512, 512, image.pixels));
      views.push({
        file,
        view: 'flight',
        shading: 'pattern',
        phase: i / 8,
        timeSeconds: i / 4,
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
    views,
  });
  console.log(spec.id + ': ' + poses.map(x => x.technicalStatus).join(', '));
}
const poses = records.flatMap(x => x.poses),
  counts = {
    models: records.length,
    samples: poses.length,
    pass: poses.filter(x => x.technicalStatus === 'pass').length,
    warning: poses.filter(x => x.technicalStatus === 'warning').length,
    fail: poses.filter(x => x.technicalStatus === 'fail').length,
    excludedGenes: poses.reduce((s, x) => s + x.excludedGenes, 0),
    images: records.reduce((s, x) => s + x.views.length, 0),
    clippedImages: records.flatMap(x => x.views).filter(x => x.clipped).length,
  };
const report = {
  format: 'morph-lab-frontier-batch',
  version: 1,
  createdAt: new Date().toISOString(),
  counts,
  backend: 'foundation-cpu',
  visualStatus: 'not-approved',
  gpuVerified: false,
  physicsVerified: false,
  note: 'Actual shared body and new-part geometry, at eight phases. Vertex pigment approximates the GPU shader. No automated self-intersection, ecological accuracy, physics, or production approval. Each model is fitted separately; all phases of one model share a frame.',
  records,
};
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(counts));
if (counts.fail) process.exitCode = 1;
