/** Compare unmodified v10 input with this release. Supply an extracted v10 root. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PRESET_MODELS, preset } from '../src/core/presets.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { libraryCoverage } from '../src/core/library-coverage.js';
import { fitFrame, rasterize } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
if (!process.argv[2]) throw new Error('Supply the extracted, unmodified v10 root.');
const base = pathToFileURL(resolve(process.argv[2]) + '/');
const old = await import(new URL('src/review/foundation.js', base)),
  oldPresets = await import(new URL('src/core/presets.js', base)),
  oldCoverage = (await import(new URL('src/core/library-coverage.js', base))).libraryCoverage();
const out = new URL('../test-results/v11/preservation/', import.meta.url);
await mkdir(out, { recursive: true });
function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}
function geometry(s) {
  const h = createHash('sha256');
  for (const m of s.meshes) {
    h.update(m.name + '|' + m.material);
    for (const k of ['positions', 'normals', 'indices', 'uvs'])
      if (m[k]) h.update(new Uint8Array(m[k].buffer, m[k].byteOffset, m[k].byteLength));
  }
  return h.digest('hex');
}
const recipes = [],
  samples = [];
for (const { id } of PRESET_MODELS) {
  const previous = oldPresets.preset(id),
    current = preset(id);
  recipes.push({ id, match: sha(JSON.stringify(previous)) === sha(JSON.stringify(current)) });
  if (!oldCoverage.models.find(x => x.id === id)?.completeGeometryReview) continue;
  const a = new old.FoundationCompiler(previous),
    b = new FoundationCompiler(current);
  for (const phase of [0.125, 0.625]) {
    const x = geometry(a.sample({ pose: 'motion-cycle', phase })),
      y = geometry(b.sample({ pose: 'motion-cycle', phase }));
    samples.push({ id, phase, match: x === y, sha256: y });
  }
}
const views = [];
for (const id of ['mossback', 'glider', 'tendril', 'fiend']) {
  const a = new old.FoundationCompiler(oldPresets.preset(id)).sample({
      pose: 'motion-cycle',
      phase: 0.375,
    }),
    b = new FoundationCompiler(preset(id)).sample({ pose: 'motion-cycle', phase: 0.375 }),
    frame = fitFrame([a, b]);
  for (const [label, s] of [
    ['before', a],
    ['after', b],
  ]) {
    const r = rasterize(s, { width: 460, height: 460, frame, view: 'quarter', shading: 'clay' });
    await writeFile(new URL(id + '-' + label + '.png', out), encodePNG(460, 460, r.pixels));
    views.push({
      id,
      label,
      meshes: s.meshes.length,
      excludedGenes: s.excludedGenes,
      clipped: r.clipped,
    });
  }
}
const report = {
  baseline: 'Unmodified Morph-Lab-v10-source.zip',
  recipes: {
    tested: recipes.length,
    passed: recipes.filter(x => x.match).length,
    failures: recipes.filter(x => !x.match),
  },
  existingCompleteGeometry: {
    samples: samples.length,
    passed: samples.filter(x => x.match).length,
    failures: samples.filter(x => !x.match),
  },
  views,
  scope:
    'Hashes compare positions, normals, indices and UVs for two samples of each previously complete model. Old unsupported parts are deliberate new triangulation. No GPU comparison.',
  currentCoverage: libraryCoverage().counts,
};
await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2));
await writeFile(new URL('geometry-hashes.json', out), JSON.stringify(samples, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.recipes.failures.length || report.existingCompleteGeometry.failures.length)
  process.exitCode = 1;
