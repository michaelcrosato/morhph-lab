/** Produce real files and independent source fixtures. No external engines needed. */
import { mkdir, writeFile } from 'node:fs/promises';
import { preset } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { buildDelivery } from '../src/export/delivery.js';
import { deliveryPose } from '../src/export/glb.js';
import { fitFrame, rasterize } from '../src/review/raster.js';
import { encodePNG } from './png.mjs';
const out = new URL('../test-results/v11/packing/', import.meta.url);
await mkdir(out, { recursive: true });
const records = [];
for (const id of ['mossback', 'glider', 'reef', 'tendril', 'fiend', 'archivist']) {
  const source = preset(id),
    c = new FoundationCompiler(source),
    dir = new URL(id + '/', out);
  await mkdir(dir, { recursive: true });
  const opts = { mode: 'motion', frames: 9, acknowledgeWarnings: true },
    separate = await buildDelivery(source, { ...opts, meshLayout: 'separate' }),
    grouped = await buildDelivery(source, { ...opts, meshLayout: 'material' });
  await writeFile(new URL('separate.glb', dir), separate.glb);
  await writeFile(new URL('model.glb', dir), grouped.glb);
  await writeFile(new URL('asset.zip', dir), grouped.zip);
  await writeFile(new URL('manifest.json', dir), JSON.stringify(grouped.manifest, null, 2));
  const snapshots = Array.from({ length: 9 }, (_, i) =>
      c.sample({ pose: 'motion-cycle', phase: i / 8 }),
    ),
    camera = fitFrame(snapshots),
    fixtures = [];
  const imageReports = [];
  for (let i = 0; i < 9; i++) {
    const s = snapshots[i],
      file = 'source-' + i + '.f32';
    let offset = 0;
    const chunks = [],
      meshes = [];
    for (const m of s.meshes) {
      const bytes = new Uint8Array(
        m.positions.buffer,
        m.positions.byteOffset,
        m.positions.byteLength,
      );
      chunks.push(bytes);
      meshes.push({ name: m.name, firstFloat: offset / 4, floatCount: m.positions.length });
      offset += bytes.length;
    }
    const data = new Uint8Array(offset);
    let k = 0;
    for (const bytes of chunks) {
      data.set(bytes, k);
      k += bytes.length;
    }
    await writeFile(new URL(file, dir), data);
    fixtures.push({
      file,
      phase: i / 8,
      timeSeconds: (grouped.manifest.animation.durationSeconds * i) / 8,
      meshes,
    });
    if ([2, 5].includes(i)) {
      const decoded = deliveryPose(
          grouped.glb,
          (grouped.manifest.animation.durationSeconds * i) / 8,
        ).map(m => ({ ...m, color: [180, 180, 180] })),
        settings = { width: 420, height: 420, view: 'quarter', shading: 'clay', frame: camera },
        a = rasterize(s, settings),
        b = rasterize({ ...s, meshes: decoded }, settings);
      let difference = 0;
      for (let k = 0; k < a.pixels.length; k++) if (a.pixels[k] !== b.pixels[k]) difference++;
      await writeFile(new URL('source-' + i + '.png', dir), encodePNG(420, 420, a.pixels));
      await writeFile(new URL('grouped-' + i + '.png', dir), encodePNG(420, 420, b.pixels));
      imageReports.push({
        sample: i,
        phase: i / 8,
        changedColorChannels: difference,
        clipped: a.clipped || b.clipped,
      });
    }
  }
  await writeFile(new URL('fixtures.json', dir), JSON.stringify(fixtures, null, 2));
  records.push({
    id,
    label: source.name,
    sourceMeshes: separate.manifest.totals.meshes,
    groupedMeshes: grouped.manifest.totals.meshes,
    triangles: grouped.manifest.totals.triangles,
    vertices: grouped.manifest.totals.vertices,
    separateBytes: separate.glb.length,
    groupedBytes: grouped.glb.length,
    internalReadback: grouped.report.internalGLBRoundTrip,
    images: imageReports,
    warningCount: grouped.report.warningCount,
  });
  console.log(records.at(-1));
}
await writeFile(
  new URL('report.json', out),
  JSON.stringify(
    {
      records,
      backend: 'actual CPU geometry + GLB readback',
      gpuVerified: false,
      visualApproval: false,
    },
    null,
    2,
  ),
);
