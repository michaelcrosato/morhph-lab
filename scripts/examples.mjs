/** Regenerate examples/ from the presets and the per-collection generators in scripts/examples/.
 *
 *   node scripts/examples.mjs           rewrite examples/
 *   node scripts/examples.mjs --check   generate into a temporary folder and fail if examples/ differs
 *
 * Generators run in order; each one writes through scripts/examples/output.mjs.
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EXAMPLES_DIR, setOutput } from './examples/output.mjs';

const GENERATORS = ['base', 'tidal', 'frontier', 'bloom', 'field'];
const check = process.argv.includes('--check');
const target = check ? await mkdtemp(path.join(os.tmpdir(), 'morph-examples-')) : EXAMPLES_DIR;

setOutput(target);
for (const name of GENERATORS) await import(`./examples/${name}.mjs`);

if (check) {
  const jsonFiles = async dir => (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
  const [expected, actual] = await Promise.all([jsonFiles(target), jsonFiles(EXAMPLES_DIR)]);
  const missing = expected.filter(f => !actual.includes(f)),
    extra = actual.filter(f => !expected.includes(f)),
    changed = [];
  for (const file of expected.filter(f => actual.includes(f))) {
    const [a, b] = await Promise.all([
      readFile(path.join(target, file), 'utf8'),
      readFile(path.join(EXAMPLES_DIR, file), 'utf8'),
    ]);
    if (a !== b) changed.push(file);
  }
  await rm(target, { recursive: true, force: true });
  for (const [label, files] of Object.entries({ missing, extra, changed }))
    if (files.length) console.error(`${label} (${files.length}): ${files.join(', ')}`);
  if (missing.length || extra.length || changed.length) {
    console.error('examples/ is out of date. Run: node scripts/examples.mjs');
    process.exitCode = 1;
  } else console.log(`examples/ matches the generators (${expected.length} files).`);
}
