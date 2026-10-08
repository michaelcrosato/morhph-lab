/** Project metadata shared by the build, dev server, and install check. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGE = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
export const APP_VERSION = PACKAGE.version;

/** Pinned engine packages. The versions come from package.json dependencies. */
export const ENGINES = {
  three: {
    version: PACKAGE.dependencies.three,
    entry: 'build/three.module.js',
  },
  '@dimforge/rapier3d-compat': {
    version: PACKAGE.dependencies['@dimforge/rapier3d-compat'],
    entry: 'rapier.mjs',
  },
};

export const cdnUrl = id =>
  `https://cdn.jsdelivr.net/npm/${id}@${ENGINES[id].version}/${ENGINES[id].entry}`;
export const localUrl = id => `/node_modules/${id}/${ENGINES[id].entry}`;
