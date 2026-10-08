/** Tide & Sky examples. Each file uses the same public contract as the editor. */
import { mkdir, writeFile } from 'node:fs/promises';
import { preset, validateGenome } from '../src/core/genome.js';
import { TIDAL_MODELS, TIDAL_KITS } from '../src/core/tidal-catalog.js';
import { defaultMixSettings, createMixRecipe, mixGenomes } from '../src/core/mixer.js';
import { applyPartKit } from '../src/core/kits.js';
import { actorManifest, generateActorBatch } from '../src/core/actors.js';
import { ReviewSession } from '../src/review/session.js';
const directory = new URL('../examples/', import.meta.url);
await mkdir(directory, { recursive: true });
const write = (name, data) =>
  writeFile(new URL(name, directory), JSON.stringify(data, null, 2) + '\n');
for (const { id } of TIDAL_MODELS) await write(id + '.morph.json', preset(id));
for (const [a, b, seed, motion] of [
  ['ribbondrift', 'rayskimmer', 4611, 0.4],
  ['sailwing', 'velvetmoth', 4612, 0.65],
  ['moonbell', 'skymedusa', 4613, 0.7],
]) {
  const settings = {
      ...defaultMixSettings(),
      seed,
      topology: 'a',
      channels: { body: 0.25, parts: 0.45, pigment: 0.6, surface: 0.6, motion },
    },
    name = a + '-' + b;
  const sourceA = preset(a),
    sourceB = preset(b);
  await write(name + '.morphmix.json', createMixRecipe(sourceA, sourceB, settings));
  await write(name + '-result.morph.json', mixGenomes(sourceA, sourceB, settings).genome);
}
for (const id of Object.keys(TIDAL_KITS)) {
  const source = preset('sprout');
  source.parts = [];
  source.name = 'Foundation with ' + TIDAL_KITS[id].label;
  await write(id + '-kit.morph.json', applyPartKit(validateGenome(source), id).genome);
}
for (const id of ['needleswimmer', 'moonbell', 'sailwing', 'gyreseed'])
  await write(id + '.actor.json', actorManifest(preset(id)));
await write(
  'reef-school.roster.json',
  generateActorBatch(preset('needleswimmer'), { count: 6, seed: 4614, variation: 0.25 }),
);
await write(
  'sky-flock.roster.json',
  generateActorBatch(preset('sailwing'), { count: 6, seed: 4615, variation: 0.2 }),
);
for (const id of ['moonbell', 'ribbondrift', 'sailwing']) {
  const session = new ReviewSession(preset(id));
  session.settings.pose = 'motion-cycle';
  session.settings.phase = 0.3;
  session.settings.shading = 'pattern';
  session.settings.view = 'flight';
  session.notes =
    'Inspect the generated body and Tide & Sky parts. CPU pigment is an approximation. No GPU, physics, or production approval.';
  await write(id + '-motion.review.json', session.export());
}
console.log(
  'Wrote 16 Tide & Sky models, 3 mixer recipes and results, 6 kit results, 4 actor manifests, 2 rosters, and 3 review sessions.',
);
