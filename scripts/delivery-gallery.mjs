/** Render source and exported GLB geometry with one camera and one clay material. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { preset } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { fitFrame, rasterize } from '../src/review/raster.js';
import { deliveryPose } from '../src/export/glb.js';
import { encodePNG } from './png.mjs';
const out = new URL('../test-results/v10/readback/', import.meta.url);
await mkdir(out, { recursive: true });
const records = [];
for (const id of ['archivist', 'trailhound', 'moonbell', 'glassdart']) {
  const g = preset(id),
    compiler = new FoundationCompiler(g),
    directory = new URL('../test-results/v10/samples/' + id + '/', import.meta.url),
    manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8')),
    glb = await readFile(new URL('model.glb', directory));
  const snapshots = [0.25, 0.625].map(phase =>
      compiler.sample({ pose: 'motion-cycle', phase, garment: true, details: true }),
    ),
    frame = fitFrame(snapshots);
  for (let i = 0; i < snapshots.length; i++) {
    const source = snapshots[i],
      decoded = deliveryPose(glb, manifest.animation.durationSeconds * [0.25, 0.625][i]);
    const target = {
      ...source,
      meshes: decoded.map((m, k) => ({
        ...m,
        material: source.meshes[k].material,
        color: source.meshes[k].color,
      })),
    };
    const options = {
      width: 380,
      height: 380,
      frame,
      view: compiler.human ? 'quarter' : 'flight',
      shading: 'clay',
    };
    const a = rasterize(source, options),
      b = rasterize(target, options);
    let changed = 0,
      max = 0;
    for (let k = 0; k < a.pixels.length; k++) {
      if (a.pixels[k] !== b.pixels[k]) changed++;
      max = Math.max(max, Math.abs(a.pixels[k] - b.pixels[k]));
    }
    await writeFile(new URL(id + '-' + i + '-source.png', out), encodePNG(380, 380, a.pixels));
    await writeFile(new URL(id + '-' + i + '-glb.png', out), encodePNG(380, 380, b.pixels));
    records.push({
      id,
      label: g.name,
      phase: [0.25, 0.625][i],
      changedColorChannels: changed,
      maxChannelDifference: max,
      clipped: a.clipped || b.clipped,
      frame,
    });
  }
}
await writeFile(
  new URL('report.json', out),
  JSON.stringify(
    {
      scope: 'Actual CPU clay renders of source and exported GLB. No GPU material claim.',
      records,
    },
    null,
    2,
  ),
);
console.log(
  records.map(r => ({
    id: r.id,
    phase: r.phase,
    changed: r.changedColorChannels,
    clipped: r.clipped,
  })),
);
