import { preset } from '../src/core/genome.js';
import { FoundationCompiler } from '../src/review/foundation.js';
import { auditSnapshot } from '../src/review/audit.js';
import { writeFile } from 'node:fs/promises';
const records = [];
for (const id of ['abyssangler', 'revenant']) {
  const c = new FoundationCompiler(preset(id)),
    samples =
      id === 'abyssangler'
        ? Array.from({ length: 8 }, (_, i) => ({ pose: 'motion-cycle', phase: i / 8 }))
        : [
            { pose: 'crouch', phase: 0.7 },
            { pose: 'crouch', phase: 1 },
          ];
  for (const settings of samples) {
    const snapshot = c.sample(settings),
      a = auditSnapshot(snapshot);
    records.push({
      id,
      ...settings,
      status: a.technicalStatus,
      excludedGenes: snapshot.excludedGenes,
      checks: a.checks,
    });
  }
}
await writeFile(
  new URL('../test-results/v11/retained-warnings.json', import.meta.url),
  JSON.stringify(
    {
      records,
      note: 'Retained problem poses, not new production approvals.',
      gpuVerified: false,
      physicsVerified: false,
    },
    null,
    2,
  ),
);
console.log(
  records.map(r => ({
    id: r.id,
    phase: r.phase,
    status: r.status,
    excludedGenes: r.excludedGenes,
  })),
);
