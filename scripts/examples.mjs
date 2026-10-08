/** Portable examples use the same validated registries as the editor. */
import { mkdir, writeFile } from 'node:fs/promises';
import { preset, PRESET_MODELS, serializeGenome } from '../src/core/genome.js';
import { defaultMixSettings, mixGenomes, createMixRecipe } from '../src/core/mixer.js';
import { applyPartKit } from '../src/core/kits.js';
import { actorManifest, generateActorBatch } from '../src/core/actors.js';
import {
  FOUNDATIONS,
  foundationBlueprint,
  deriveFoundation,
  SHAPE_PROFILES,
  FoundationCompiler,
} from '../src/review/foundation.js';
import { ReviewSession } from '../src/review/session.js';
import { fitFrame } from '../src/review/raster.js';
import { syncHumanoidBody } from '../src/core/humanoid.js';
const directory = new URL('../examples/', import.meta.url);
await mkdir(directory, { recursive: true });
const write = (name, value) =>
  writeFile(new URL(name, directory), JSON.stringify(value, null, 2) + '\n');
for (const { id } of PRESET_MODELS)
  await writeFile(new URL(id + '.morph.json', directory), serializeGenome(preset(id)) + '\n');
const pairs = [
  [
    'carapace',
    'glider',
    { body: 0.35, parts: 0.68, pigment: 0.4, surface: 0.6, motion: 0.75 },
    8128,
    'auto',
  ],
  [
    'reef',
    'lantern',
    { body: 0.25, parts: 0.55, pigment: 0.7, surface: 0.7, motion: 0.35 },
    9217,
    'auto',
  ],
  [
    'grazer',
    'sentinel',
    { body: 0.35, parts: 0.6, pigment: 0.55, surface: 0.65, motion: 0.5 },
    42,
    'auto',
  ],
  [
    'warden',
    'fiend',
    { body: 0.35, parts: 0.72, pigment: 0.45, surface: 0.65, motion: 0.4 },
    7021,
    'auto',
  ],
  [
    'wayfarer',
    'ogre',
    { body: 0.45, parts: 0.5, pigment: 0.35, surface: 0.35, motion: 0.6 },
    1934,
    'auto',
  ],
  ['ranger', 'glider', { body: 0.2, parts: 0.8, pigment: 0.7, surface: 0.6, motion: 0 }, 9001, 'a'],
  [
    'grovekeeper',
    'clockwork',
    { body: 0.35, parts: 0.65, pigment: 0.4, surface: 0.5, motion: 0.25 },
    4201,
    'a',
  ],
  [
    'crownstag',
    'shardback',
    { body: 0.4, parts: 0.75, pigment: 0.45, surface: 0.6, motion: 0.4 },
    2311,
    'a',
  ],
  [
    'oracle',
    'sunmanta',
    { body: 0.2, parts: 0.65, pigment: 0.5, surface: 0.5, motion: 0.2 },
    9182,
    'a',
  ],
];
for (const [aId, bId, channels, seed, topology] of pairs) {
  const a = preset(aId),
    b = preset(bId),
    settings = { ...defaultMixSettings(), channels, seed, topology },
    name = aId + '-' + bId;
  await write(name + '.morphmix.json', createMixRecipe(a, b, settings));
  await write(name + '-result.morph.json', mixGenomes(a, b, settings).genome);
}
for (const id of ['wayfarer', 'warden', 'arcanist', 'duelist', 'grovekeeper', 'clockwork'])
  await write(id + '.actor.json', actorManifest(preset(id)));
await write(
  'warden-patrol.roster.json',
  generateActorBatch(preset('warden'), { count: 6, seed: 8128, variation: 0.28 }),
);
await write(
  'travel-party.roster.json',
  generateActorBatch(preset('outrider'), { count: 6, seed: 4201, variation: 0.3 }),
);
await write('guard-kit.morph.json', applyPartKit(preset('wayfarer'), 'guard').genome);
await write('botanical-kit.morph.json', applyPartKit(preset('sprout'), 'botanical').genome);
console.log(
  `Wrote ${PRESET_MODELS.length} model blueprints, ${pairs.length} mixer recipes, ${pairs.length} mix results, 6 actor manifests, 2 rosters, and 2 kit results.`,
);

for (const f of FOUNDATIONS)
  await write('foundation-' + f.id + '.morph.json', foundationBlueprint(f.id));
for (const id of Object.keys(SHAPE_PROFILES).filter(k => k !== 'unchanged')) {
  const g = deriveFoundation(foundationBlueprint('balanced'), id);
  g.name = SHAPE_PROFILES[id].label;
  await write('derived-' + id + '.morph.json', g);
}
const defined = foundationBlueprint('balanced'),
  classic = structuredClone(defined);
classic.rig.bodyStyle = 'classic';
syncHumanoidBody(classic);
const review = new ReviewSession(classic);
review.setCandidate(defined);
review.settings.layout = 'compare';
review.frame = fitFrame([
  new FoundationCompiler(classic).sample(),
  new FoundationCompiler(defined).sample(),
]);
review.notes =
  'Compare the defined head and neck with the original soft blend. No production approval. Inspect joints, hands, clothing, game materials, and all required motions.';
await write('classic-defined.review.json', review.export());
console.log(
  `Added ${FOUNDATIONS.length} inspection foundations, 5 derivative recipes, and 1 comparison session.`,
);
