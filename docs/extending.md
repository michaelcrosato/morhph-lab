# Extending Morph Lab

Content is data plus engine-free code. Add new content through the existing registries so every consumer (validation, editor, mixer, Inspector, Workshop and export) picks it up together. Read [architecture.md](architecture.md) first.

General rules:

- Keep geometry, motion and surface code free of Three.js, Rapier, the DOM and storage. Only `src/creature/`, `src/render/`, `src/physics/` and UI modules may touch them.
- Compute every sample from rest data and absolute time. Never accumulate state between samples.
- Never mutate a source blueprint to build a variant; build a new one and call `validateGenome`.
- Do not add a special-case renderer, physics object or code path for one model.
- Append to enumerations (patterns, microtextures, part families, recipes). Existing IDs and their order are part of saved files and shader mappings.
- Old builds cannot read new IDs. Saved files keep schema 6 unless the data layout changes; a layout change needs a new schema version and an upgrade path in `core/genome.js`.

## Add a part family

A part family only works end to end if it has **shared CPU geometry**. `SHARED_PARTS` in `src/core/shared-parts.js` is the single list of families with that geometry, and every consumer checks it:

| Consumer | Behaviour for a type not in `SHARED_PARTS` |
|---|---|
| Asset export (`deliveryEligibility` in `src/export/delivery.js`) | Blocks the export and names the family: it fails the coverage gate |
| Inspector (`review/foundation.js`) | Excludes the gene and reports it as omitted |
| Library coverage (`core/library-coverage.js`) | Lists the family as unsupported |
| Workshop (`defaultRegistry()` in `creature/parts.js`) | Has no factory: `registerTidalParts()` in `creature/tidal-parts.js` registers `tidalPartFactory` for exactly the `SHARED_PARTS` types |
| Geometry (`compileTidalPart`) | Throws |

So do not write a Three.js-only factory. The path is:

1. **Metadata.** Add an entry to the content pack's catalog (for example `FIELD_PARTS` in `src/core/field-catalog.js`): `label`, `category`, `description`, three `variants` labels, default `anchor` (a direction from the host centre), `size`, `length`, `mirror`, and optionally a default humanoid `socket`. For a new pack, create a `*-catalog.js` and spread its parts into `SHARED_PARTS`. `CATALOG` in `core/catalog.js` includes `SHARED_PARTS`, so validation, the Parts library, kits and the mixer accept the type.
2. **Geometry.** Implement a builder that emits local meshes through the `add(mesh, material, behavior, detail)` callback, as `buildFieldPart` and `buildBloomPart` do. Local +Y is the mount normal; the assembler applies anchor, normal, twist and the shared bend, so do not apply them again. `p.size` already includes presence. Use `p.variant` (0–2) for the three shapes and `p.bend`, `p.length`, `p.flex` and `p.phase` for the shared controls. Mark fixed details (eyes, grips, lamp glass) with `detail` so a part-material choice does not replace them. Helpers are in `parametric-mesh.js` and `solid-mesh.js`.
3. **Dispatch.** `compileTidalPart` in `core/tidal-geometry.js` picks the builder by catalog membership. Add your pack's builder to that dispatch if it is new.
4. **Motion.** Give animated components a behaviour object tagged with your pack (`{pack: 'field', mode: ...}`) and handle it in the pack's `animate*Vertex` (plus an optional `prepare*Motion` for per-sample setup). `sampleTidalPart` routes by the `pack` tag. Zero flex must leave the part static. Mirrored copies must reflect both shape and motion.
5. **UI.** Add an SVG path keyed by the type in `src/ui/icons.js`; otherwise a generic icon is shown.

Nothing needs to be registered by hand: `defaultRegistry()` already covers every `SHARED_PARTS` type, and registering a type twice throws.

### Checks for a new family

- Finite positions and normals and valid indices for all three variants, mirrored and unmirrored.
- Deterministic seeking: the same time gives the same sample after any sequence of other samples.
- Zero-flex poses, serialization round trips, mixing and actor export.
- Inspector coverage and a passing export: `node scripts/check-catalog-delivery.mjs` builds and reads back every library model.
- A rendered look at the actual model in the Inspector (`node scripts/catalog-review.mjs --render`), then the Three.js adapter and shaders on a WebGL2 machine.

If you change shared geometry or diagnostic poses, bump `REVIEW_IMPLEMENTATION` in `src/review/session.js` so saved review decisions reset. Tide & Sky and Strange Forms geometry is pinned by hash fixtures: `node scripts/geometry-regression.mjs` reports differences, and its `--baseline SUITE DIR` option re-records a fixture from a given source tree.

## Add a kit

Add an entry to the pack's `*_KITS` (for example `FIELD_KITS`) with `label`, `family` (`any` or `humanoid`), `note` and a `parts` list. Each part spec gives `type`, `host`, `anchor` and optional `size`, `length`, `variant`, `phase`, `twist`, `flex`, `material`, `mirror`, `socket` and `socketOffset`. `PART_KITS` in `core/content-pack.js` merges the pack kits.

`applyPartKit` builds a new blueprint first and checks the rig and the 32-gene limit, so a failed kit never changes its source. Missing hosts fall back to a valid node. Kits must not change the travel medium or motion recipe.

## Add a model

Models are ordinary validated blueprints built from existing parts.

- **Pack model:** add metadata (`id`, `label`, `family`, `note`, and `medium` and `collection` where the pack uses them) to the pack's `*_MODELS` list, and the recipe to its `*-presets.js`. `PRESET_MODELS` and `preset()` in `core/presets.js` dispatch by membership; a new pack needs entries in both.
- **Humanoid:** add the recipe to `core/humanoid-presets.js` (or a pack preset) with bounded proportions, call `syncHumanoidBody()`, then validate.
- **Creature:** start from a base model, create parts with `createPart`, and call `validateGenome`.

Use stable sibling node IDs and a consistent hierarchy across related models: the mixer matches structural paths, not names. Add the model to the example generators and add a mixer source-pair test.

## Add a creature motion recipe

Add an entry to the pack's motion table (`FRONTIER_MOTION`, `BLOOM_MOTION`, `FIELD_MOTION`) or to `MOTION_CLIPS` in `core/motion.js`. Supply every scalar channel the existing entries define (see `idle`), and keep a nonzero stance window below 1 for moving recipes. The Motion tab builds its controls from this registry.

A new secondary gain needs a `MOTION_LAYERS` entry, a default, and a consumer in part geometry or the animator. A slider without a runtime consumer adds nothing.

## Add a humanoid action

Add the definition (`label`, `duration`, default `mask`, `loop`, optional `hold`, and `events` as `{at, name}` pairs at normalized times) to a pack's `*_ACTIONS`, which `HUMANOID_ACTIONS` merges. Implement the pose in that pack's `apply*Action` (called from `sampleHumanoidAction` in `core/humanoid-motion.js`), using stable bone names. Samples must be absolute in time. An action entry without a pose sampler adds no animation.

Prop-aware actions can read `core/equipment-pose.js` for grip and bow-pull hints. Markers are timing cues; do not apply game effects in the rig.

## Add a pigment pattern or microtexture

- **Pattern:** append the ID to the pack's `*_PATTERNS`, implement the CPU function in the pack's `*Pattern` (used by `review/pigment.js`), and add the same equation as the next branch in the pack's `*_PATTERN_GLSL`. The GLSL branches are matched by index, so never reorder IDs. Keep output finite and within 0–1.
- **Microtexture:** append the ID to the pack's `*_MICRO` and return a tileable height from its `*MicroHeight`. `generateMicroTexture` produces the seeded texture. A height texture affects bump shading only, not silhouette or collision.
- **Surface recipe:** add an entry to the pack's `*_SURFACES` combining existing pattern, microtexture and material values.

The skin has a fixed four-layer array. More layers would need coordinated changes to validation, the mixer, shader uniforms, UI, limits and tests. After any shader change, compile it on a WebGL2 machine (System checks or the shader test).

## Extend the humanoid foundation

Shared humanoid details live in `core/foundation-shapes.js`; both the Workshop runtime and the Inspector consume that plan. A new primitive needs an entry in the plan registry and in its shared buffer generator, plus a test for finite data and correct indices.

A new rig family needs a complete contract: schema validation, canonical body rules, skeleton or part layout, runtime compiler, animator, socket resolver, anatomy analysis, compatibility report, mixer family policy, migration and tests, plus a pure skeleton, layout and skin-weight function for the Inspector's compiler. Do not reuse humanoid poses on arbitrary body graphs, and do not call a rig verified because it shows a static mesh.

Keep AI outside the rig: a game controller should read role values, choose motion and action, drive the physics controller, and own health and damage.

## Use the core without the editor

These operations need no Three.js, Rapier, DOM or storage:

```js
import {preset} from './src/core/presets.js';
import {applyPartKit} from './src/core/kits.js';
import {applyPartArray} from './src/core/part-arrays.js';
import {defaultMixSettings, mixGenomes} from './src/core/mixer.js';
import {actorManifest, generateActorBatch} from './src/core/actors.js';

const equipped = applyPartKit(preset('wayfarer'), 'guard').genome;
const settings = defaultMixSettings();
settings.topology = 'a';
settings.channels.parts = 0.6;
const result = mixGenomes(equipped, preset('grovekeeper'), settings);
const roster = generateActorBatch(result.genome, {count: 6, seed: 4201, variation: 0.3});
console.log(result.notes, actorManifest(result.genome), roster);
```

`applyPartArray(blueprint, partId, {layout, axis, count, phaseStep})` returns `{genome, added}` and leaves the source unchanged.

Shared part geometry can be sampled directly:

```js
import {preset} from './src/core/genome.js';
import {analyze} from './src/core/anatomy.js';
import {sampleMotion} from './src/core/motion.js';
import {compileTidalPart, sampleTidalPart} from './src/core/tidal-geometry.js';

const genome = preset('glassdart');
const part = analyze(genome).parts.find(p => p.type === 'insectwing');
const plan = compileTidalPart(part);
const pose = sampleMotion(genome.motion, {preview: true});
let frame = sampleTidalPart(plan, 0, pose);
frame = sampleTidalPart(plan, 0.25, pose, frame); // reuse buffers
// Each component has local positions, normals, indices, UVs and a material.
// Apply the part's mount transform before drawing in world space.
```

Use the validated parsers (`parseGenome`, `parseMixRecipe`, `parseActorManifest`, `parseActorRoster`, `parseReviewSession`) for external JSON. They rebuild allowed fields and reject malformed data.

## After a change

Run `npm test` for data, geometry and recipe logic, and `node scripts/validate-examples.mjs` for the shipped examples. Run the engine and browser suites with the pinned engines installed, and check shaders and rendering on a WebGL2 machine; [testing.md](testing.md) lists the suites. A passing CPU or editor test is not a rendered or gameplay result: look at the actual model.
