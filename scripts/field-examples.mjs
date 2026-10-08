import { mkdir, writeFile } from 'node:fs/promises';
import { preset, validateGenome } from '../src/core/genome.js';
import { FIELD_MODELS, FIELD_KITS } from '../src/core/field-catalog.js';
import { defaultMixSettings, createMixRecipe, mixGenomes } from '../src/core/mixer.js';
import { applyPartKit } from '../src/core/kits.js';
import { actorManifest, generateActorBatch } from '../src/core/actors.js';
import { ReviewSession } from '../src/review/session.js';
const dir = new URL('../examples/', import.meta.url);
await mkdir(dir, { recursive: true });
let count = 0;
async function save(name, data) {
  await writeFile(new URL(name, dir), JSON.stringify(data, null, 2) + '\n');
  count++;
}
for (const { id } of FIELD_MODELS) await save(id + '.morph.json', preset(id));
for (const [id, def] of Object.entries(FIELD_KITS)) {
  const g = preset(def.family === 'humanoid' ? 'wayfarer' : 'sprout');
  g.parts = [];
  g.name = def.label + ' source';
  await save(id + '-kit.morph.json', applyPartKit(validateGenome(g), id).genome);
}
for (const [a, b, seed] of [
  ['trailhound', 'hillgrazer', 9101],
  ['fieldmedic', 'lamplighter', 9102],
  ['waypostarcher', 'prospector', 9103],
]) {
  const A = preset(a),
    B = preset(b),
    s = defaultMixSettings();
  s.seed = seed;
  s.channels = { body: 0.35, parts: 0.35, pigment: 0.6, surface: 0.65, motion: 0.3 };
  const name = 'field-' + a + '-' + b;
  await save(name + '.morphmix.json', createMixRecipe(A, B, s));
  await save(name + '-result.morph.json', mixGenomes(A, B, s).genome);
}
for (const id of ['trailhound', 'lamplighter', 'archivist', 'waypostarcher'])
  await save(id + '.actor.json', actorManifest(preset(id)));
for (const id of ['fieldmedic', 'hillgrazer'])
  await save(
    id + '-group.roster.json',
    generateActorBatch(preset(id), { seed: 9110, count: 6, variation: 0.2 }),
  );
for (const id of ['trailhound', 'lamplighter', 'waypostarcher']) {
  const s = new ReviewSession(preset(id));
  s.settings.pose = 'motion-cycle';
  s.settings.phase = 0.38;
  s.settings.shading = 'pattern';
  s.settings.view = 'quarter';
  s.notes =
    'Review actual shared triangles and equipment clearance. Fixed socket poses are not two-hand constraints. No GPU or physics approval.';
  await save(id + '-task.review.json', s.export());
}
console.log('Wrote ' + count + ' Field & Settlement examples.');
