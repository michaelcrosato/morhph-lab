#!/usr/bin/env node
/** Installation report only. Browser evidence comes from System checks. */
import { readFile, writeFile } from 'node:fs/promises';
import { APP_VERSION, ENGINES } from './project.mjs';
const checks = [];
for (const [id, { version: want }] of Object.entries(ENGINES)) {
  try {
    const p = JSON.parse(
      await readFile(new URL('../node_modules/' + id + '/package.json', import.meta.url), 'utf8'),
    );
    checks.push({
      id,
      status: p.version === want ? 'pass' : 'fail',
      expected: want,
      actual: p.version,
    });
  } catch {
    checks.push({
      id,
      status: 'blocked',
      expected: want,
      reason: 'Engine package is not installed.',
    });
  }
}
const report = {
  format: 'morph-lab-install-check',
  version: 1,
  applicationVersion: APP_VERSION,
  node: process.version,
  checks,
  browserTestsRun: false,
  gpuVerified: false,
  physicsVerified: false,
  instructions:
    'Run npm install, npm run dev, then System checks > Check engines + physics. Export that report.',
};
const at = process.argv.indexOf('--out');
if (at !== -1) {
  if (!process.argv[at + 1]) throw new Error('Missing output path.');
  await writeFile(process.argv[at + 1], JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (checks.some(c => c.status !== 'pass')) process.exitCode = 2;
