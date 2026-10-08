import { libraryCoverage } from '../src/core/library-coverage.js';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
const report = libraryCoverage();
await writeFile(
  new URL('../test-results/v9-library-coverage.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report.counts, null, 2));
