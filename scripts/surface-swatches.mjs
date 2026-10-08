/** Render surface recipes as CPU pigment swatches plus their procedural height maps.
 *
 *   node scripts/surface-swatches.mjs                       every collection
 *   node scripts/surface-swatches.mjs --collection bloom    frontier, bloom, or field
 *
 * For each surface: <id>-sphere.png (pigment on a sphere), <id>.png (the pattern sampled
 * per pixel on a flat field), and <id>-height.png (the micro-surface height map).
 * Output: test-results/swatches/<collection>/.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { FRONTIER_SURFACES } from '../src/core/frontier-surfaces.js';
import { BLOOM_SURFACES } from '../src/core/bloom-surfaces.js';
import { FIELD_SURFACES } from '../src/core/field-surfaces.js';
import { generateMicroTexture } from '../src/core/surfaces.js';
import { preset, validateGenome } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { sampleReviewPigment } from '../src/review/pigment.js';
import { encodePNG } from './png.mjs';
import { ROOT } from './project.mjs';

/** `plane` maps a flat-field pixel (u, v in -0.75..0.75) to the 3D pattern domain. */
const COLLECTIONS = {
  frontier: { surfaces: FRONTIER_SURFACES, seed: 713, plane: (u, v) => [u, 0, v] },
  bloom: { surfaces: BLOOM_SURFACES, seed: 813, plane: (u, v) => [u, 0, v] },
  field: { surfaces: FIELD_SURFACES, seed: 813, plane: (u, v) => [u, v, 0] },
};
const SIZE = 320;

const at = process.argv.indexOf('--collection');
const selected = at < 0 ? Object.keys(COLLECTIONS) : [process.argv[at + 1]];
for (const name of selected)
  if (!COLLECTIONS[name])
    throw new Error(`Unknown collection ${name}; use ${Object.keys(COLLECTIONS).join(', ')}.`);

for (const name of selected) {
  const { surfaces, seed, plane } = COLLECTIONS[name];
  const out = path.join(ROOT, 'test-results/swatches', name);
  await mkdir(out, { recursive: true });
  const records = [];
  for (const [id, s] of Object.entries(surfaces)) {
    const g = preset('sprout');
    g.parts = [];
    g.nodes = [{ id: 'core', parent: null, offset: [0, 0, 0], radii: [0.75, 0.75, 0.75] }];
    Object.assign(g.appearance, s, {
      color: '#386e78',
      accent: '#e5c89a',
      patternScale: 5,
      strength: 1,
      warp: 0,
      layers: [],
      textureSeed: seed,
    });
    delete g.appearance.label;
    const snapshot = new FoundationCompiler(validateGenome(g)).sample({ pose: 'bind' }),
      image = rasterize(snapshot, {
        width: SIZE,
        height: SIZE,
        frame: fitFrame([snapshot]),
        view: 'flight',
        shading: 'pattern',
      });
    await writeFile(path.join(out, id + '-sphere.png'), encodePNG(SIZE, SIZE, image.pixels));
    // Flat fields sample the procedural function per pixel. Unlike the fast CPU
    // mesh preview, they do not interpolate a sparse set of vertex colors.
    const flat = new Uint8ClampedArray(SIZE * SIZE * 4),
      appearance = { ...g.appearance, textureSeed: 0 };
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const u = (x / (SIZE - 1) - 0.5) * 1.5,
          v = (y / (SIZE - 1) - 0.5) * 1.5;
        const color = sampleReviewPigment(appearance, plane(u, v), [56, 110, 120]);
        flat.set([...color, 255], (y * SIZE + x) * 4);
      }
    await writeFile(path.join(out, id + '.png'), encodePNG(SIZE, SIZE, flat));
    await writeFile(
      path.join(out, id + '-height.png'),
      encodePNG(128, 128, generateMicroTexture(seed, s.micro, 128)),
    );
    records.push({
      id,
      label: s.label,
      pattern: s.pattern,
      micro: s.micro,
      clipped: image.clipped,
      backend: 'CPU pigment and generated height map',
    });
  }
  await writeFile(path.join(out, 'report.json'), JSON.stringify(records, null, 2) + '\n');
  console.log(`${name}: rendered ${records.length} surfaces to ${path.relative(ROOT, out)}/`);
}
