/** Compare current shared-geometry output with hashes recorded from earlier releases.
 * No engine or network. Normal use never rewrites a fixture.
 *
 *   node scripts/geometry-regression.mjs                 check every suite
 *   node scripts/geometry-regression.mjs --suite v7      check one suite
 *   node scripts/geometry-regression.mjs --baseline v6 /path/to/unmodified-v6-source
 *                                                        re-record a fixture from an old tree
 *
 * v6 pins the Tide & Sky part families and models, v7 the Strange Forms ones.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './project.mjs';

const SUITES = {
  v6: {
    label: 'Tide & Sky (v6)',
    catalog: 'src/core/tidal-catalog.js',
    parts: 'TIDAL_PARTS',
    models: 'TIDAL_MODELS',
    motion: 'flutter',
  },
  v7: {
    label: 'Strange Forms (v7)',
    catalog: 'src/core/frontier-catalog.js',
    parts: 'FRONTIER_PARTS',
    models: 'FRONTIER_MODELS',
    motion: 'chainpump',
  },
};
const fixturePath = id => path.join(ROOT, 'tests/fixtures', `${id}-shared-geometry.json`);

function option(name) {
  const at = process.argv.indexOf(name);
  if (at < 0) return null;
  const value = process.argv[at + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
  return value;
}

function hashMeshes(meshes) {
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

/** Samples every part family (3 variants, mirrored sides, 3 times) and every model (3 phases). */
async function sampleSuite(suite, root) {
  const load = p => import(pathToFileURL(path.join(root, p)).href);
  const [
    { preset, createPart, validateGenome },
    { expandParts },
    catalog,
    { defaultMotion, sampleMotion },
    { compileTidalPart, sampleTidalPart },
    { FoundationCompiler },
  ] = await Promise.all([
    load('src/core/genome.js'),
    load('src/core/anatomy.js'),
    load(suite.catalog),
    load('src/core/motion.js'),
    load('src/core/tidal-geometry.js'),
    load('src/review/foundation.js'),
  ]);
  const entries = [];
  for (const type of Object.keys(catalog[suite.parts]))
    for (let variant = 0; variant < 3; variant++) {
      const g = preset('sprout');
      g.parts = [
        { ...createPart(g, type, 'core', [1, 0.22, 0.05], true), variant, size: 0.8, length: 1.15 },
      ];
      for (const [side, p] of expandParts(validateGenome(g)).entries())
        for (const t of [0, 0.137, 1.75]) {
          const plan = compileTidalPart(p),
            pose = sampleMotion(defaultMotion(suite.motion));
          entries.push({
            key: `part/${type}/${variant}/${side}/${t}`,
            sha256: hashMeshes(sampleTidalPart(plan, t, pose)),
          });
        }
    }
  for (const { id } of catalog[suite.models]) {
    const c = new FoundationCompiler(preset(id));
    for (const phase of [0, 0.137, 0.875])
      entries.push({
        key: `model/${id}/${phase}`,
        sha256: hashMeshes(c.sample({ pose: 'motion-cycle', phase }).meshes),
      });
  }
  return entries;
}

const baseline = option('--baseline');
if (baseline) {
  const suite = SUITES[baseline];
  const source = process.argv[process.argv.indexOf('--baseline') + 2];
  if (!suite)
    throw new Error(`Unknown suite ${baseline}; use ${Object.keys(SUITES).join(' or ')}.`);
  if (!source) throw new Error(`Missing the unmodified ${baseline} source directory.`);
  const entries = await sampleSuite(suite, path.resolve(source));
  await writeFile(
    fixturePath(baseline),
    JSON.stringify(
      {
        format: `${baseline}-shared-geometry-sha256`,
        source: `Unmodified Morph-Lab-${baseline}-source.zip`,
        scope: 'Positions, normals, indices and UV arrays. Not GPU shading or physics.',
        entries,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Recorded ${entries.length} original ${baseline} geometry samples.`);
} else {
  const only = option('--suite');
  if (only && !SUITES[only]) throw new Error(`Unknown suite ${only}.`);
  const results = [];
  for (const [id, suite] of Object.entries(SUITES)) {
    if (only && id !== only) continue;
    const fixture = JSON.parse(await readFile(fixturePath(id), 'utf8'));
    const expected = new Map(fixture.entries.map(x => [x.key, x.sha256]));
    const entries = await sampleSuite(suite, ROOT);
    const failures = entries.filter(x => expected.get(x.key) !== x.sha256).map(x => x.key);
    if (expected.size !== entries.length) failures.push('sample-count');
    results.push({
      suite: id,
      label: suite.label,
      samples: entries.length,
      passed: entries.length - failures.length,
      failures,
      source: fixture.source,
    });
    console.log(
      `${id} ${suite.label}: ${entries.length - failures.length}/${entries.length} match`,
    );
  }
  const report = {
    suite: 'shared-geometry hash regression',
    scope: 'Positions, normals, indices and UV arrays. Not GPU shading or physics.',
    results,
  };
  await mkdir(path.join(ROOT, 'test-results'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'test-results/geometry-regression.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  if (results.some(r => r.failures.length)) {
    for (const r of results) if (r.failures.length) console.error(r.suite, r.failures.slice(0, 20));
    process.exitCode = 1;
  }
}
