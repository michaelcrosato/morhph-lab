/** Generate true CPU pigment swatches and the procedural height maps. */
import { mkdir, writeFile } from 'node:fs/promises';
import { FRONTIER_SURFACES } from '../src/core/frontier-surfaces.js';
import { generateMicroTexture } from '../src/core/surfaces.js';
import { preset, validateGenome } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
import { sampleReviewPigment } from '../src/review/pigment.js';
const out = new URL('../test-results/v7-swatches/', import.meta.url),
  records = [];
await mkdir(out, { recursive: true });
for (const [id, s] of Object.entries(FRONTIER_SURFACES)) {
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
    textureSeed: 713,
  });
  delete g.appearance.label;
  const snapshot = new FoundationCompiler(validateGenome(g)).sample({ pose: 'bind' }),
    image = rasterize(snapshot, {
      width: 320,
      height: 320,
      frame: fitFrame([snapshot]),
      view: 'flight',
      shading: 'pattern',
    });
  await writeFile(new URL(id + '-sphere.png', out), encodePNG(320, 320, image.pixels));
  // Flat fields sample the procedural function per pixel. Unlike the fast CPU
  // mesh preview, they do not interpolate a sparse set of vertex colors.
  const flat = new Uint8ClampedArray(320 * 320 * 4),
    appearance = { ...g.appearance, textureSeed: 0 };
  for (let y = 0; y < 320; y++)
    for (let x = 0; x < 320; x++) {
      const color = sampleReviewPigment(
        appearance,
        [(x / 319 - 0.5) * 1.5, 0, (y / 319 - 0.5) * 1.5],
        [56, 110, 120],
      );
      flat.set([...color, 255], (y * 320 + x) * 4);
    }
  await writeFile(new URL(id + '.png', out), encodePNG(320, 320, flat));
  await writeFile(
    new URL(id + '-height.png', out),
    encodePNG(128, 128, generateMicroTexture(713, s.micro, 128)),
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
await writeFile(new URL('report.json', out), JSON.stringify(records, null, 2) + '\n');
console.log('Rendered eight new patterns and their height maps.');
