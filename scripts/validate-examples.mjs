/** Validate every shipped example with the public parsers. No engine is needed. */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseGenome } from '../src/core/genome.js';
import { parseMixRecipe } from '../src/core/mixer.js';
import { parseActorManifest, parseActorRoster } from '../src/core/actors.js';
import { parseReviewSession } from '../src/review/session.js';
const root = new URL('../', import.meta.url),
  items = [];
for (const file of (await readdir(new URL('examples/', root)))
  .filter(x => x.endsWith('.json'))
  .sort()) {
  const text = await readFile(new URL('examples/' + file, root), 'utf8');
  let kind;
  if (file.endsWith('.review.json')) {
    parseReviewSession(text);
    kind = 'review';
  } else if (file.endsWith('.morphmix.json')) {
    parseMixRecipe(text);
    kind = 'mixer';
  } else if (file.endsWith('.actor.json')) {
    parseActorManifest(text);
    kind = 'actor';
  } else if (file.endsWith('.roster.json')) {
    parseActorRoster(text);
    kind = 'roster';
  } else {
    parseGenome(text);
    kind = 'blueprint';
  }
  items.push({ file, kind, status: 'passed' });
}
const counts = {};
for (const { kind } of items) counts[kind] = (counts[kind] || 0) + 1;
await mkdir(new URL('test-results/', root), { recursive: true });
const report = { status: 'passed', passed: items.length, counts, files: items };
await writeFile(
  new URL('test-results/examples-report.json', root),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify({ passed: items.length, counts }, null, 2));
