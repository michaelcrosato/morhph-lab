/** Build, audit, and read back every static preset. Reports only; no asset overwrite.
 * Warning acknowledgement is explicit for this technical sweep. Keep every warning.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PRESET_MODELS, preset } from '../src/core/presets.js';
import { buildDelivery } from '../src/export/delivery.js';
const records = [],
  out = new URL('../test-results/v11/static-exports.json', import.meta.url);
await mkdir(new URL('./', out), { recursive: true });
for (const { id } of PRESET_MODELS) {
  try {
    const r = await buildDelivery(preset(id), {
      mode: 'static',
      pose: 'bind',
      meshLayout: 'material',
      acknowledgeWarnings: true,
    });
    records.push({
      id,
      exported: true,
      technicalStatus: r.report.technicalStatus,
      warningCount: r.report.warningCount,
      sourceMeshes: r.manifest.packing.sourceMeshes,
      meshes: r.manifest.totals.meshes,
      triangles: r.manifest.totals.triangles,
      bytes: r.glb.length,
      allActiveGenesIncluded: r.manifest.geometry.allActiveGenesIncluded,
      roundTrip: r.report.internalGLBRoundTrip,
      sha256: createHash('sha256').update(r.glb).digest('hex'),
    });
  } catch (e) {
    records.push({ id, exported: false, error: e.message });
  }
  console.log(id, records.at(-1).exported ? 'exported' : 'FAILED');
}
const result = {
  tested: records.length,
  exported: records.filter(x => x.exported).length,
  failures: records.filter(x => !x.exported),
  technicalWarnings: records.filter(x => x.warningCount > 0),
  scope:
    'Static bind-pose GLB builds and internal binary readback. Warnings explicitly allowed and retained. Not GPU or visual approval.',
  records,
};
await writeFile(out, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    tested: result.tested,
    exported: result.exported,
    failures: result.failures.length,
    warnings: result.technicalWarnings.length,
  }),
);
if (result.failures.length) process.exitCode = 1;
