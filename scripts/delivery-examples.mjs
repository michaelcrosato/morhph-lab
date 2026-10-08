/** Generate actual delivery packages and original pose fixtures for independent checks. */
import { mkdir, writeFile } from 'node:fs/promises';
import { preset } from '../src/core/genome.js';
import { buildDelivery } from '../src/export/delivery.js';
import { FoundationCompiler, motionCycleTime } from '../src/review/foundation.js';
const root = new URL('../test-results/v10/samples/', import.meta.url);
await mkdir(root, { recursive: true });
const models = [
  ['wayfarer', 'static'],
  ['archivist', 'motion'],
  ['trailhound', 'motion'],
  ['moonbell', 'motion'],
  ['glassdart', 'motion'],
  ['salpchain', 'motion'],
];
const index = [];
for (const [id, mode] of models) {
  const g = preset(id),
    asset = await buildDelivery(g, { mode, frames: 9, acknowledgeWarnings: true }),
    directory = new URL(id + '/', root);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('model.glb', directory), asset.glb);
  await writeFile(new URL(id + '.asset.zip', directory), asset.zip);
  await writeFile(new URL('manifest.json', directory), JSON.stringify(asset.manifest, null, 2));
  await writeFile(new URL('audit.json', directory), JSON.stringify(asset.report, null, 2));
  const compiler = new FoundationCompiler(g),
    fixtures = [];
  const phases = mode === 'motion' ? [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] : [0.5];
  for (let i = 0; i < phases.length; i++) {
    const s = compiler.sample({
        pose: mode === 'motion' ? 'motion-cycle' : 'bind',
        phase: phases[i],
        garment: true,
        details: true,
      }),
      positions = new Float32Array(s.meshes.reduce((n, m) => n + m.positions.length, 0));
    let offset = 0;
    for (const m of s.meshes) {
      positions.set(m.positions, offset);
      offset += m.positions.length;
    }
    const filename = 'source-pose-' + i + '.bin';
    await writeFile(new URL(filename, directory), new Uint8Array(positions.buffer));
    fixtures.push({
      file: filename,
      phase: phases[i],
      time: mode === 'motion' ? motionCycleTime(g.motion, phases[i], compiler.human) : 0,
      meshLengths: s.meshes.map(m => m.positions.length),
    });
  }
  index.push({
    id,
    mode,
    fixtures,
    glbBytes: asset.glb.length,
    zipBytes: asset.zip.length,
    triangles: asset.manifest.totals.triangles,
    meshes: asset.manifest.totals.meshes,
    technicalStatus: asset.report.technicalStatus,
  });
  console.log(id, asset.glb.length, asset.report.technicalStatus);
}
await writeFile(new URL('index.json', root), JSON.stringify(index, null, 2));
