# Morph Lab v8 — Carapace & Bloom guide

## 1. Purpose and delivery

Version 8 adds jointed leg banks, shell valves, flower structures, masks, cup stems, and open cages. The new model recipes include ground creatures, swimmers, fliers, and humanoid roles. They use generated geometry and the same part controls as the editor. They are not imported models or color-only copies.

Use `dist/Morph-Lab-Review.html` to start in the offline Inspector. Workshop is in the same file. No second HTML file, API key, or account is needed. The delivered Workshop still needs internet access for Three.js r181 and Rapier 3D compat 0.19.3, plus WebGL2. A failed engine load has a Return to Inspect button. Export work before closing the browser. Local browser storage is not a backup.

For source use, run `npm install` and `npm run dev`, then open `http://localhost:3000`. The source uses Node.js 20 or later. Application version is 8.0.0; blueprint schema is still 6. Old blueprints can be imported. Old builds cannot read the new part, motion, and surface values. Version 8 uses new local save keys and can read earlier keys without overwriting them.

## 2. Fourteen new model recipes

| Group | Model | Main construction |
| --- | --- | --- |
| Ground | Pebble crawler | Low body, curved plate band, two banks of five jointed legs, iris mouth |
| Ground | Moss strider | Raised neck, tall two-link legs, back plates, long whiskers |
| Ground | Crown grazer | Six legs, upright flower crown, iris mouth |
| Ground | Dune auger | Long four-node body, sequenced cup stems, plate band, broad iris |
| Water | Clap shell | Small soft body inside two ribbed hinged valves |
| Water | Lantern polyp | Open rib cage, lower petal crown, long cup stems |
| Water | Bristle skate | Wide flat body, paired whisker fans, split trunk at the rear |
| Water | Sucker ribbon | Four body nodes, paired cup clusters, front trunk |
| Air | Bloom kite | Two tiers of broad curling petals around a narrow body |
| Air | Basket drifter | Suspended body inside a diamond cage, whiskers, lower trunk |
| Humanoid | Apiarist | Hood, beaked mask, hand-mounted cup tool, small back cage |
| Humanoid | Shrine sentinel | Broad armor, slit visor, cage shoulders, chest plates |
| Humanoid | Marsh forager | Long limbs, broad trunk muzzle, whiskers, back plates |
| Humanoid | Thorn envoy | Leaf mask, flower crown, petal shoulders |

The library has 79 models: 21 humanoids and 58 creatures. Eighteen models use Water travel and 16 use Air travel. The other 45 use Ground travel. The content, travel-medium, and text filters combine. Filtering does not change the current candidate.

The model sheet contains actual generated triangles. Each model has its own fitted camera. Its eight animation samples use one fixed camera frame. Differences in apparent size between separate models are not physical scale measurements.

## 3. Ten part families and six kits

Each new part has three geometric variants:

| Part family | Shape choices | Motion |
| --- | --- | --- |
| Jointed leg bank | Three, four, or five legs | Independent phase and analytic two-link IK |
| Overlapping plate band | Five, seven, or nine plates | Separate plate hinges |
| Petal crown | Five, seven, or nine petals | Broad petal curl and closing motion |
| Hinged valves | Scallop, round, or pointed | Two shells rotate about their base |
| Tube foot cluster | Seven, eleven, or fifteen cups | Stems contract in sequence |
| Iris mouth | Six, eight, or ten blades | Overlapping blades change the opening |
| Lattice cage | Oval, bell, or diamond | Small basket motion around an inner core |
| Whisker array | Seven, eleven, or fifteen whiskers | Different phases along the fan |
| Sectioned trunk | Tapered, broad muzzle, or split tip | Curved centerline and collar rings |
| Face plate | Beaked mask, slit visor, or leaf mask | Follows its mount; no independent deformation |

The editor exposes size, length, shape, bend, twist, phase, flex, symmetry, presence, and material. A material choice does not replace protected dark eye or grip details. Part geometry is grouped by material and motion ranges. It does not create one Three object for every small rod or plate. GPU performance has not been measured.

The new kits are **Segmented, Blossom, Bivalve, Sensory, Basket, and Masked guard**. Kits create ordinary editable genes in one undo step. The Masked guard kit requires a humanoid. Kits check the 32-gene limit before making a change. They do not select a new travel medium. Parts added in a kit can overlap; the tool does not solve artistic clearance automatically.

## 4. Ring, fan, and row arrays

In Workshop, select a part in Anatomy. Open **Part arrays**, choose the layout and axis, set the count, then select **Add part array**. The count includes the original part. A count of four adds three copies. The valid count is two to eight.

**Ring** rotates anchor directions around X, Y, or Z. **Fan** spreads directions across the selected angle, starting at the source. **Row** moves copies by equal local offsets. The offset axis is in the part's rest body or joint frame, not the camera frame. Phase step offsets the animation phase of each new copy.

Each result is an independent gene. Editing or deleting the source later does not update its copies. The complete addition is one undo transaction. Cancelled or invalid requests do not change the blueprint.

Ring and Fan require Mirror to be off. They also require an anchor that does not point along the selected rotation axis. On paired joints, such as hands, forearms, or feet, use Row. A ring on these sockets could change the side assignment, so the command rejects it. Center body, head, chest, and pelvis sockets can use all layouts. Rows must stay within the local offset limit of one unit on each axis. The global 32-gene limit still applies.

The following source example needs no renderer:

```js
import {preset, createPart, validateGenome} from './src/core/genome.js';
import {applyPartArray} from './src/core/part-arrays.js';

const source = preset('sprout');
source.parts = [];
const feeler = createPart(source, 'whiskerfan', 'core', [1, 0.1, 0.1], false);
feeler.size = 0.4;
source.parts.push(feeler);

const result = applyPartArray(validateGenome(source), feeler.id, {
  layout: 'ring', axis: 'y', count: 5, phaseStep: 0.17
});
// result.genome is a new validated blueprint. source is unchanged.
// result.added contains the four new IDs. The editor owns the undo step.
```

The archive includes ring, fan, and row examples. Arrays are saved as normal blueprint parts, not as hidden generator links.

## 5. Creature motion and humanoid actions

The six new creature recipes are **Ripple walk, Shell clap, Bloom cycle, Trunk reach, Cup sequence, and Sensory sweep**. They blend through the existing motion channels. They drive leg banks, valves, petals, trunks, cup stems, and whiskers in different ways. They are not one common flap animation.

All samples start from the rest mesh. Changing time repeatedly does not accumulate deformation. Zero flex stops independent part motion. These recipes are not humanoid base gaits. An incompatible base recipe is reported rather than used to drive humanoid legs.

The new humanoid actions are **Salute, Beckon, Shiver, Stretch, Lift overhead, and Sweep tool**. They use the existing action weight, speed, repeat, replay, and upper/full-body masks. Stretch defaults to full-body control. Other new actions default to the upper body. There are 29 actions plus No action in the complete library.

Lift overhead emits `grip-cue` and `lift-peak` timing events. Sweep tool emits `sweep-contact`. These are animation cues, not detected contact, inventory changes, or damage. The actions do not attach a held object, constrain both hands to a tool, or apply force. Motion against equipment needs a visual clearance check after changes in proportions.

Leg banks use visual two-link IK. Downward leg-bank and cup-stem rest samples now set a fixed Ground clearance. They do not add individual foot colliders, terrain contact, propulsion, or a balance solver. Water and Air travel remain bounded arcade control. Body deformation changes the mesh, not the collider.

## 6. Procedural surface additions

Eight new pigment fields are **scute edges, petal veins, pollen, saddle marks, stitch grid, oxidation, maze, and growth bands**. Six new height textures are **scutes, petal grain, suction, rib cloth, gravel, and hammered**.

Eight material recipes combine these fields with roughness, metalness, relief, and emission: **Scute armor, Petal wax, Pollen dust, Saddle hide, Field cloth, Oxidized plate, Maze enamel, and Growth shell**. Six palettes add Pollen field, Petal dusk, Sage plate, Marsh, Rose clay, and Patina. Existing pattern and palette entries keep their old indices.

The complete surface system has 42 pigment patterns, 28 microtextures, 42 material recipes, and 32 palettes. The existing four-layer appearance limit remains. The mixer can blend pigment and surface separately from body and parts.

The surface atlas samples CPU pigment functions per pixel, using one comparison palette and seed. Its small height images are the actual generated texture arrays. Fast model inspection instead interpolates vertex pigment. Small patterns can look coarse on a sparse mesh. Neither view verifies GPU shader compilation, roughness, emission, or lighting. Material names do not imply physical optics or a measured substance.

## 7. Offline model and action review

The Inspector now draws shared procedural parts on humanoid joints. A head mask follows the head, and a hand-mounted cup cluster follows the hand. The CPU adapter uses the same rest mount and sampled bone transform convention as the Three adapter.

This coverage applies to the **37 shared geometry families** from versions 6–8. The other 28 older attachment factories are still excluded from CPU inspection. The Inspector reports the omitted gene count. Omissions do not delete genes from the blueprint. All 14 new model recipes have zero omitted genes.

For humanoids, select an action in **Humanoid action** and set **Action mask**. Both controls edit the candidate and clear manual approval decisions. Select **motion-cycle**. Phase 0–1 covers one full selected action, adjusted for action speed. The captions and audit report include sample time in seconds. No action and creature cycles use a two-second sample window.

When motion-cycle is selected, **Pose sheet** exports eight frames of that cycle. Other humanoid pose choices retain the eight-pose diagnostic sheet. Joint mounts are included in both. The CPU humanoid gait is diagnostic; it does not reproduce runtime terrain-aware IK. An A/B comparison samples each blueprint's own action clock at the selected normalized phase.

Actual inspection found a trunk cross-section shear error, overly flat plate surfaces, and a chest plate that covered part of the sentinel mask. The release corrects those issues. A small body-dimension change also removed near-zero body triangles in Dune auger. The source contains regression tests for these corrections. Remaining stylized limbs, garment joins, and possible intersections require manual review. A technical pass does not approve a character for production.

## 8. Reuse, tests, and source locations

The update retains the five-channel mixer, fixed source snapshots, locks, Apply/Cancel, undo/redo, seeded mutation, actor manifests, and seeded rosters. Matching dimensions blend numerically. Discrete shapes, materials, and rig families select one option. The tool does not morph arbitrary incompatible skeletons.

There are 200 validated JSON examples: 144 blueprints, 19 mixer recipes, 11 review sessions, 18 actor manifests, and eight rosters. Version 8 adds 41 files. Regenerate them with `npm run examples:bloom`; validate all examples with `npm run test:examples`.

New modules are `bloom-catalog.js`, `bloom-presets.js`, `bloom-motion.js`, `bloom-surfaces.js`, `bloom-geometry.js`, and `part-arrays.js` in `src/core/`. UI controls are in `src/ui/part-array-panel.js`. Humanoid review changes are in `src/review/foundation.js` and `src/review/app.js`. Runtime types are documented in `src/core/types.d.ts`; validation functions are authoritative.

Run these checks from the source folder:

```bash
npm test
npm run test:examples
npm run test:geometry-regression
npm run test:v7-geometry
npm run review:bloom -- --render
npm run swatches:bloom
npm run gallery:bloom
npm run build
npm run test:bloom-ui
```

Core tests and CPU review need no graphics engine. UI tests need Python Playwright and Chromium. Gallery assembly needs Pillow. Use the `CHROMIUM_PATH` environment variable to select the browser where supported by the script.

**Verified in this release:** 850 core tests; 499 browser checks; 200 JSON examples; 112 new-model geometry samples; and 570 original geometry-hash samples from v6/v7. The 79-model mixer matrix includes 31,205 pair/weight combinations. The old v7 batch still passes 96 samples. The old v6 batch has 120 passes and eight retained Abyss angler arm-crown warnings.

**Blocked or unverified:** engine installation failed at DNS resolution. The browser did not provide WebGL2. Direct local-file navigation was blocked by the test environment. Exact combined HTML was exercised through browser `set_content`, including its real navigation buttons. No direct Windows launch, full Three rendering, GPU shader, Rapier gameplay, or engine-embedded build is claimed as verified. `npm run test:bloom-engine` cannot start without the pinned packages; no mock physics test replaces it. `npm run build -- --offline` correctly fails without installed engines.

The limits remain eight body nodes, 32 part genes, and 1–24 actors in a generated roster. No new AI, navigation, combat, ragdoll, physical cloth, glTF animation baking, or automatic LOD is included. The authored source is MIT-licensed; the engines have separate licenses. Preview images are generated evidence, not loaded runtime assets. No font files or engine packages are included in this source delivery.
