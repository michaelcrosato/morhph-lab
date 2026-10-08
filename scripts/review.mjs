/** Headless foundation inspection. No browser, engines, network or AI service.
 * npm run review:batch -- --render
 * npm run review:batch -- --catalog
 * npm run review:batch -- --foundation balanced --render --out ./my-review
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  FoundationCompiler,
  FOUNDATIONS,
  foundationBlueprint,
  REVIEW_POSES,
} from '../src/review/foundation.js';
import { PRESET_MODELS } from '../src/core/presets.js';
import { preset } from '../src/core/genome.js';
import { auditSnapshot, fingerprint } from '../src/review/audit.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
const args = process.argv.slice(2),
  value = (key, fallback) => {
    const i = args.indexOf(key);
    if (i === -1) return fallback;
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + key);
    return args[i + 1];
  };
const out = path.resolve(
    value('--out', new URL('../test-results/review/foundation/', import.meta.url).pathname),
  ),
  selected = value('--foundation', null),
  catalog = args.includes('--catalog'),
  render = args.includes('--render');
if (selected && !FOUNDATIONS.some(x => x.id === selected))
  throw new Error('Unknown foundation: ' + selected);
await mkdir(out, { recursive: true });
const records = [];
const sources = catalog
  ? PRESET_MODELS.map(x => ({ id: x.id, genome: preset(x.id) }))
  : FOUNDATIONS.filter(x => !selected || x.id === selected).map(x => ({
      id: x.id,
      genome: foundationBlueprint(x.id),
    }));
for (const source of sources) {
  const compiler = new FoundationCompiler(source.genome),
    poseRecords = [],
    snapshots = [];
  for (const pose of compiler.human ? REVIEW_POSES.filter(x => x !== 'motion-cycle') : ['bind']) {
    const phase = pose === 'sit' ? 1 : pose === 'stride' ? 0.25 : 0.7,
      snapshot = compiler.sample({ pose, phase }),
      audit = auditSnapshot(snapshot);
    snapshots.push(snapshot);
    poseRecords.push({
      pose,
      phase,
      technicalStatus: audit.technicalStatus,
      visualStatus: audit.visualStatus,
      totals: audit.totals,
      bounds: audit.bounds,
      checks: audit.checks,
    });
  }
  const frame = fitFrame(snapshots),
    images = [];
  if (render)
    for (const snapshot of snapshots) {
      const view = 'quarter',
        image = rasterize(snapshot, { width: 512, height: 512, view, frame }),
        file = source.id + '-' + snapshot.pose + '.png';
      await writeFile(path.join(out, file), encodePNG(512, 512, image.pixels));
      images.push({
        file,
        view,
        pose: snapshot.pose,
        phase: snapshot.phase,
        frame,
        clipped: image.clipped,
        maskPixels: image.mask.reduce((a, b) => a + b, 0),
        backend: 'foundation-cpu',
      });
    }
  records.push({
    id: source.id,
    blueprintFingerprint: fingerprint(source.genome),
    blueprint: source.genome,
    coverage: snapshots[0].coverage,
    excludedGenes: snapshots[0].excludedGenes,
    poses: poseRecords,
    images,
  });
  console.log(
    source.id +
      ': ' +
      poseRecords.length +
      ' pose checks' +
      (render ? ', ' + images.length + ' PNG views' : ''),
  );
}
const poseResults = records.flatMap(r => r.poses),
  counts = {
    sources: records.length,
    poses: poseResults.length,
    pass: poseResults.filter(x => x.technicalStatus === 'pass').length,
    warning: poseResults.filter(x => x.technicalStatus === 'warning').length,
    fail: poseResults.filter(x => x.technicalStatus === 'fail').length,
  };
const report = {
  format: 'morph-lab-foundation-batch',
  version: 1,
  createdAt: new Date().toISOString(),
  counts,
  backend: 'foundation-cpu',
  visualStatus: 'not-reviewed',
  gpuVerified: false,
  physicsVerified: false,
  note: 'This checks source geometry and diagnostic poses only. A technical pass does not approve an asset. No self-intersection or full-runtime attachment test.',
  records,
};
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(counts));
if (counts.fail) process.exitCode = 1;
