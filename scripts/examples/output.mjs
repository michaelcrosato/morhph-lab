/** Where the example generators write. scripts/examples.mjs redirects it for --check. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../project.mjs';

export const EXAMPLES_DIR = path.join(ROOT, 'examples');
let directory = EXAMPLES_DIR;

export function setOutput(dir) {
  directory = dir;
}

/** Writes one example file; objects are stored as two-space JSON. */
export async function writeExample(name, data) {
  await mkdir(directory, { recursive: true });
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await writeFile(path.join(directory, name), text + '\n');
}
