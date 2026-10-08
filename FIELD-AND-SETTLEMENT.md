> Historical release note. For v11, read `COMPLETE-COVERAGE-GUIDE.md` and `verification.json`.

# Morph Lab v9 — Field & Settlement

## Purpose

This release fills gaps found in the v8 library. It does not add another set of unusual swimming and flying forms. All models, part geometry, textures, and animations remain procedural. There are no imported models, texture images, or animation clips.

The application version is 9.0.0. The blueprint schema remains 6. The game pins are Three.js 0.181.0, Rapier compat 0.19.3, and WebGL2. The offline Inspector uses a separate CPU geometry renderer. It is not a WebGL1 fallback.

## 1. What the review found

The review covered the actual source archive, preset graphs, part registrations, role profiles, motion tables, surface tables, saved examples, and rendered models. The unmodified v8 source passed 850 core tests in this environment before the changes.

| Area | v8 finding | Decision |
|---|---|---|
| Model coverage | 79 models: 21 humanoids and 58 creatures. There were 18 Water and 16 Air models. | Keep these groups. Use this release to fill other gaps. |
| Role coverage | 59 recipes used the Monster role. Only four humanoids used Civilian. | Add daily-use civilian roles and their equipment. |
| Land forms | Many ground models used armor, flowers, unusual appendages, or the original walker legs. | Add four readable animal foundations with paws, hooves, or webbed feet. |
| Existing parts | All 65 families had at least one preset use. Shield, banner, claw, and club tail each had only one. | Reuse existing parts instead of adding a similar new family for every role. |
| Inspection coverage | 28 families were missing from offline inspection. Packs, shields, ears, and muzzles were among them. Only 48 of 79 recipes had no omitted genes. | Move 12 older families to the shared geometry path. |
| Release proof | CPU geometry and editor tests existed. GPU shaders and Rapier play remained unverified. | Keep this limit explicit. Do not treat a CPU pass as game approval. |

The input inventory is recorded in `test-results/v8-inventory-audit.json`. The current inventory is in `test-results/v9-library-coverage.json`.

## 2. Current inventory

| Asset type | Added in v9 | Total |
|---|---:|---:|
| Model recipes | 10 | 89 |
| Humanoid recipes | 6 | 27 |
| Creature recipes | 4 | 62 |
| Part families | 8 | 73 |
| Shared part families | 8 new and 12 migrated | 57 |
| Part kits | 5 | 31 |
| Creature movement recipes | 3 | 37 |
| Humanoid actions | 6 | 35, plus No action |
| Pigment patterns | 4 | 46 |
| Microtextures | 3 | 31 |
| Surface recipes | 4 | 46 |
| Palettes | 4 | 36 |
| Inspection templates | 2 | 24 |

There are now nine Civilian humanoids. The raw Civilian-role count is 12 because three new animal recipes also use that non-hostile profile. These counts are not the same measurement.

Travel counts are 55 Ground, 18 Water, and 16 Air. No previous model was removed.

## 3. New model foundations

| ID | Model | Purpose and content |
|---|---|---|
| `trailhound` | Trail hound | A small companion. Four paw legs, ears, a canine muzzle, and a brush tail. |
| `hillgrazer` | Hill grazer | A grazing-animal source. A long neck, split hooves, antlers, and a tuft tail. |
| `bristletusk` | Bristle tusk | A boar-like encounter source. A heavy front body, short legs, tusks, and a bristle tail. |
| `reedhopper` | Reed hopper | A frog-like source. A broad body, large eyes, rear legs, and webbed feet. |
| `fieldmedic` | Field medic | A civilian with supply cases, a small pack, a mantle, and an offer gesture. |
| `lamplighter` | Lamplighter | A civilian with a held lamp, pouches, a split mantle, and an inspection pose. |
| `archivist` | Archivist | A civilian with an opening book, a scarf, and a reading pose. |
| `prospector` | Prospector | A civilian with a pick, an expedition pack, pouches, and a work-strike pose. |
| `waypostarcher` | Waypost archer | A guard with a long bow, a back quiver, and a draw pose. |
| `caravancourier` | Caravan courier | A civilian with a scroll, a framed pack, supply rolls, and a note pose. |

These are stylized foundations. They are not scans, anatomically exact animals, or finished production characters. Animal legs are separate jointed meshes. Humanoid garments and body details still have visible joins.

The model gallery uses a separate fitted frame for each model. Do not use it to compare their heights. The animation GIF uses eight normalized phases. It is not a recording of measured game frame rate.

## 4. New modular parts

Every family has three geometry variants. Size, length, bend, twist, phase, flex, symmetry, presence, and material remain editable through the existing gene fields.

| ID | Family | Variants |
|---|---|---|
| `beastleg` | Animal leg | Paw; split hoof; webbed foot |
| `brushtail` | Coat tail | Brush; end tuft; bristle |
| `worktool` | Work tool | Hammer; pick; spade |
| `fieldlamp` | Field lamp | Cage; hood; beacon |
| `folio` | Book and records | Book; map scroll; writing board |
| `bowrig` | Bow and quiver | Short bow; long bow; quiver |
| `utilitybelt` | Utility belt | Pouches; vial cases; supply rolls |
| `mantle` | Travel mantle | Short cape; split cape; scarf |

Animal legs use two-link visual IK and fixed support-height samples. They do not add individual colliders or terrain contacts. On a humanoid, they are additional visual parts. They do not replace the biped skeleton.

Tools do not dig, harvest, or cause damage. The lamp contains emissive geometry, not a scene light. The bow does not fire a projectile. The quiver is a different shape choice, not an inventory container. The mantle uses a fixed-root wave, not a cloth solver. Equipment fits must be checked after large proportion edits.

Five kits are available: Worker, Scholar, Archer, Night traveler, and Animal face. A kit adds normal independent genes in one undo step. It validates the rig and the 32-gene limit before changing the source. Kits do not silently change the current action or travel mode.

## 5. Existing assets made inspectable

The following 12 families now use shared CPU/runtime geometry:

`ear`, `antler`, `beak`, `muzzle`, `crystal`, `foliage`, `blade`, `shield`, `staff`, `pack`, `pauldron`, and `banner`.

They retain their existing gene names and three variants. Their triangulation is new. Do not expect byte-identical geometry for these migrated families. The older Three.js-only implementations are no longer the default path for them.

The same compiled geometry plan now feeds the offline Inspector and the Three.js adapter. There is no separate illustrated substitute. Fixed details such as dark grips and glowing lamp elements keep their assigned material when the main part material changes.

The original v6 and v7 shared-geometry fixtures still match: 570 samples of positions, normals, indices, and UV coordinates. That result does not cover GPU shading.

## 6. New motion

Creature recipes are Animal amble, Animal sniff, and Animal bound. These coordinate body pose, tail motion, and visual animal legs. The existing movement mixer accepts them.

Humanoid actions are Read book, Write note, Inspect with lamp, Draw bow, Offer item, and Rest hands on hips. They use the existing action weight, speed, repeat, mask, replay, and event system.

The bow deformation and the drawing arm use one normalized pull envelope. A release cue is a timing marker only. Seeking does not emit event cues. Zero action weight stops the action contribution. Zero flex keeps new parts static.

Held props now provide hand-curl hints. The Inspector also samples finger hinges in humanoid motion-cycle mode. Bind pose remains the diagnostic rig rest pose, not an equipment-constrained pose.

There is no two-hand constraint, automatic grip fitting, item transfer, hand-to-page contact, or gravity constraint for held objects. The free hand can be near a tool without touching it. These limits are visible in the pose sheets and need attention before close-up use.

## 7. Surfaces

New pigment patterns are Countershade, Coat flow, Repair seams, and Woven check. New microtextures are Short coat, Wool loops, and Canvas grain. Surface recipes are Short animal coat, Wool coat, Repaired cloth, and Checked cloth.

The four new palettes are Trail coat, Field service, Archive, and Lamplight.

These recipes use the existing surface layers and mixer. They do not add hair strands, physical fibers, or cloth simulation. The surface atlas samples pigment per pixel and includes the actual generated height maps. The fast Inspector uses vertex pigment, so fine marks can look coarse. Neither method proves that the GPU shader compiles.

## 8. Inspection and review workflow

Open the combined HTML. The Inspector works without a server or internet access. Both workspaces remain in one file.

In Inspect, open **All 89 blueprint sources**. Set **Content filter** to **New: Field & Settlement**. Select Trail hound, Archivist, or Waypost archer. Set Pose to `motion-cycle`. Move Pose phase. Use Fit both after a large change.

The two new templates are Four-paw companion and Equipped field worker. The equipped template retains its props. Older plain humanoid templates still remove props on purpose.

Under Library coverage, select **Export library coverage**. The report contains model roles, travel groups, part usage, and omitted families. It is a metadata and implementation-coverage report. It does not approve silhouettes or game behavior.

Current coverage is 65 of 89 models with no omitted attachment genes. There are 57 shared families out of 73.

The remaining 16 unsupported families are:

`leg`, `eye`, `horn`, `tail`, `fin`, `mouth`, `wing`, `tentacle`, `antenna`, `shell`, `mandible`, `crest`, `clubtail`, `frill`, `claw`, and `gill`.

These genes remain in blueprints and still have Workshop factories. The Inspector reports their omission. It does not remove them.

### Visual corrections made during this release

Rendered checks exposed incorrect book, lamp, and quiver directions. Book and bow mounts now use the correct hand-local axis for their task poses. The quiver is mounted vertically on the back. Palm offsets reduce visible gaps. The equipped inspection template now keeps its equipment. Finger motion is also visible in diagnostic action samples.

Current sheets show the corrected result. They are not a complete before-and-after record. Manual acceptance is still required. No test has marked the production-review checklist as approved.

## 9. Verification and limits

The final run passed 997 core tests and 591 browser checks. The new field test file contains 121 core tests. The new browser suite contains 92 checks; the other browser checks cover the previous editor, Inspector, navigation, and content sets.

All 230 example JSON files validated. This release adds 30 examples: models, kit results, mixer recipes and results, actor manifests, rosters, and review sessions.

The ten new models passed 80 sampled-pose audits. All 80 images included every gene, with no frame clipping. The v8 Carapace & Bloom batch also passed 112 pose audits. Sixty shared-part variants were rendered for inspection. A technical pass is not an intersection, anatomical, material, or production-quality approval.

Retained warning checks found eight warning poses for Abyss angler and two sampled crouch warnings for Revenant. They are recorded in `test-results/v9-retained-warnings.json`. They were not hidden or converted to passes.

Engine installation failed with `EAI_AGAIN` for the package registry. The test browser returned no WebGL2 context. Direct `file:` navigation was blocked by the test environment. Tests instead loaded the exact shipped HTML bytes and used its actual workspace buttons.

The following remain unverified here: Three.js GPU rendering, shader compilation, Rapier gameplay, the engine-embedded offline build, and direct Windows file launching. The offline Inspector and the real editor controls were exercised. No mock Three.js or Rapier implementation was used.

The largest remaining asset-system gaps are the 16 unconverted families, automatic equipment fit, terrain-aware animal feet, seamless garments, lower-detail crowd assets, and full-engine visual checks. More recipe counts do not solve these issues.

## 10. Run and extend

Use Node.js 20 or later for the source tools. Extract the source archive, then run:

```sh
cd morph-lab-v9
npm install
npm run dev
```

Open `http://localhost:3000`. With the pinned engines installed, the local server uses those files. The CDN HTML needs internet access only when Workshop starts. The Inspector needs no engine downloads.

Core and geometry checks need no engine installation:

```sh
npm test
npm run test:examples
npm run audit:library
npm run review:field -- --render
npm run review:field-parts
npm run swatches:field
python scripts/field-gallery.py
```

The browser checks require Python Playwright and Chromium. Set `CHROMIUM_PATH` when the executable is not `/usr/bin/chromium`.

```sh
npm run build -- --cdn
npm run test:field-ui
npm run test:navigation-ui
```

With the actual engines installed, run the separate engine tests. These still do not replace a visual GPU and gameplay check.

```sh
npm run test:field-engine
npm run test:engine
npm run build -- --offline
```

The main new modules are `field-catalog.js`, `field-presets.js`, `field-geometry.js`, `field-motion.js`, `field-surfaces.js`, `equipment-pose.js`, `legacy-shared-geometry.js`, `solid-mesh.js`, and `library-coverage.js` under `src/core`.

Add metadata and geometry through these existing registries. Keep CPU geometry independent of Three.js, DOM, storage, and Rapier. Compute samples from rest data. Do not mutate a source blueprint to generate a variant. Add tests and rendered evidence with each new family.

## 11. Saved files and exports

The application writes blueprint and mixer saves to v9 slots. It can read older slots, including v8, without overwriting them. The v6 schema remains unchanged. Older application versions do not know the new family, action, and surface values. Keep the previous files before opening new recipes in an older build.

Exports remain procedural blueprints, complete mixer recipes, actor manifests, actor rosters, and review records. Posed OBJ export is static geometry. There is no new baked glTF, animation-clip export, AI, navigation, combat, physical inventory, or ragdoll system.

Authored source remains MIT-licensed. The engines retain their own licenses. No font files are included.
