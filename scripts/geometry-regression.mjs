/** Compare actual v6 geometry hashes with the current shared adapter. No engine or network.
 * The shipped fixtures came from the unmodified v6 source archive.
 * To regenerate: node scripts/geometry-regression.mjs --baseline /path/to/v6
 * Normal use never rewrites the fixture.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const fixture = new URL('../tests/fixtures/v6-shared-geometry.json', import.meta.url);
const arg = process.argv.indexOf('--baseline');
if (arg >= 0 && !process.argv[arg + 1]) throw new Error('Missing v6 source directory.');
const root =
  arg >= 0 ? path.resolve(process.argv[arg + 1]) : new URL('../', import.meta.url).pathname;
const load = p => import(pathToFileURL(path.join(root, p)).href);
const [
  { preset, createPart, validateGenome },
  { expandParts },
  { TIDAL_PARTS, TIDAL_MODELS },
  { defaultMotion, sampleMotion },
  { compileTidalPart, sampleTidalPart },
  { FoundationCompiler },
] = await Promise.all([
  load('src/core/genome.js'),
  load('src/core/anatomy.js'),
  load('src/core/tidal-catalog.js'),
  load('src/core/motion.js'),
  load('src/core/tidal-geometry.js'),
  load('src/review/foundation.js'),
]);
function hash(meshes) {
  const h = createHash('sha256');
  for (const m of meshes)
    for (const key of ['positions', 'normals', 'indices', 'uvs']) {
      const a = m[key];
      if (a) {
        h.update(key);
        h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
      }
    }
  return h.digest('hex');
}
const entries = [];
for (const type of Object.keys(TIDAL_PARTS))
  for (let variant = 0; variant < 3; variant++) {
    const g = preset('sprout');
    g.parts = [
      { ...createPart(g, type, 'core', [1, 0.22, 0.05], true), variant, size: 0.8, length: 1.15 },
    ];
    for (const [side, p] of expandParts(validateGenome(g)).entries())
      for (const t of [0, 0.137, 1.75]) {
        const plan = compileTidalPart(p),
          pose = sampleMotion(defaultMotion('flutter'));
        entries.push({
          key: `part/${type}/${variant}/${side}/${t}`,
          sha256: hash(sampleTidalPart(plan, t, pose)),
        });
      }
  }
for (const { id } of TIDAL_MODELS) {
  const c = new FoundationCompiler(preset(id));
  for (const phase of [0, 0.137, 0.875])
    entries.push({
      key: `model/${id}/${phase}`,
      sha256: hash(c.sample({ pose: 'motion-cycle', phase }).meshes),
    });
}
if (arg >= 0) {
  await writeFile(
    fixture,
    JSON.stringify(
      {
        format: 'v6-shared-geometry-sha256',
        source: 'Unmodified Morph-Lab-v6-source.zip',
        scope: 'Positions, normals, indices and UV arrays. Not GPU shading or physics.',
        entries,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Recorded ' + entries.length + ' original v6 geometry samples.');
} else {
  const old = JSON.parse(await readFile(fixture, 'utf8')),
    expected = new Map(old.entries.map(x => [x.key, x.sha256]));
  const failures = entries.filter(x => expected.get(x.key) !== x.sha256).map(x => x.key);
  if (expected.size !== entries.length) failures.push('sample-count');
  const report = {
    suite: 'v6 shared-geometry hash regression',
    samples: entries.length,
    passed: entries.length - failures.length,
    failures,
    source: old.source,
    scope: old.scope,
    gpuVerified: false,
  };
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../test-results/v9-v6-geometry-regression.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}
