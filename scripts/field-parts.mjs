import { FIELD_PARTS } from '../src/core/field-catalog.js';
import { EXPANSION_PARTS } from '../src/core/expansion-catalog.js';
import { preset, createPart, validateGenome } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { rasterize, fitFrame } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../test-results/v9-part-atlas/', import.meta.url);
await mkdir(out, { recursive: true });
const rows = [];
for (const [type, def] of Object.entries({ ...EXPANSION_PARTS, ...FIELD_PARTS })) {
  const snapshots = [];
  for (let v = 0; v < 3; v++) {
    const g = preset('sprout');
    g.parts = [
      {
        ...createPart(
          g,
          type,
          'core',
          type === 'beastleg' || type === 'fieldlamp'
            ? [0, -1, 0]
            : type === 'mantle'
              ? [0, 0, -1]
              : type === 'utilitybelt'
                ? [0, 0, 1]
                : [0, 1, 0],
          false,
        ),
        variant: v,
      },
    ];
    const s = new FoundationCompiler(validateGenome(g)).sample({
      pose: 'motion-cycle',
      phase: 0.28,
    });
    s.meshes = s.meshes.slice(1);
    s.bones = [];
    s.sockets = [];
    s.bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const m of s.meshes)
      for (let i = 0; i < m.positions.length; i++) {
        const k = i % 3;
        s.bounds.min[k] = Math.min(s.bounds.min[k], m.positions[i]);
        s.bounds.max[k] = Math.max(s.bounds.max[k], m.positions[i]);
      }
    snapshots.push(s);
  }
  const frame = fitFrame(snapshots);
  for (let v = 0; v < 3; v++) {
    const im = rasterize(snapshots[v], {
      width: 320,
      height: 320,
      view: 'quarter',
      shading: 'material',
      frame,
    });
    await writeFile(new URL(type + '-' + v + '.png', out), encodePNG(320, 320, im.pixels));
    rows.push({
      type,
      variant: v,
      label: def.variants[v],
      clipped: im.clipped,
      meshCount: snapshots[v].meshes.length,
    });
  }
}
await writeFile(
  new URL('report.json', out),
  JSON.stringify(
    {
      rows,
      gpuVerified: false,
      description:
        'Actual shared geometry. Scale is fixed across the three variants of each family; not across different families.',
    },
    null,
    2,
  ),
);
console.log('Rendered ' + rows.length + ' part variations.');
