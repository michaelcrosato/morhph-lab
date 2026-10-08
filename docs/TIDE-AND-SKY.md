# Morph Lab v6 — Tide & Sky Edition

## Open the tool

The delivered `Morph-Lab-v6.html` is one combined file. It opens the Inspector. The Workshop button opens the workshop inside that file. No second HTML file is required.

The Inspector works offline. It uses a CPU depth buffer and Canvas 2D to draw actual generated triangles. It needs no API key or account. The Workshop still uses Three.js r181 (`0.181.0`), Rapier compat `0.19.3`, and WebGL2. The delivered CDN edition needs internet access for those engine packages. No WebGPU or WebGL1 fallback was added.

A failed engine load stays inside the tool. Use **Return to Inspect**, or the outer **Inspect** button. Export your blueprint or review session before closing the file. Reference images and external OBJ references must be loaded again after a workspace switch. Source, candidate, baseline, camera settings, review notes, and decisions are kept during the switch.

## Content added

| System | Added | Current total |
| --- | ---: | ---: |
| Model recipes | 16 | 53: 17 humanoids and 36 creatures |
| Part families | 15 | 43, with three variants each |
| Part kits | 6 | 14 |
| Locomotion recipes | 8 | 20 |
| Pigment patterns | 8 | 26 |
| Microtextures | 6 | 16 |
| Material recipes | 12 | 26 |
| Color palettes | 8 | 20 |
| Inspection foundations | 6 | 12 |

The existing 23 humanoid actions and seven humanoid gait styles remain. The eight new locomotion recipes are not new humanoid action clips. The existing maximum of eight body nodes and 32 part genes remains. A mirrored gene can create two structures.

All models are editable recipes. All meshes, patterns, microtextures, and motion are generated in code. These are stylized source models, not anatomically exact animals or production-approved assets.

## Sixteen different source models

| Model | Medium | Main difference | Starting motion |
| --- | --- | --- | --- |
| Needle swimmer | Water | Narrow body, fork tail, paired fins | Cruise with lateral body wave |
| Ribbon eel | Water | Seven-node long body and repeated dorsal fins | Undulation |
| Moon bell | Water | Hollow ribbed bell and hanging arm crowns | Bell pulse / jet pose |
| Coil nautiloid | Water | Logarithmic shell with an opening, siphon, and arms | Jet pose |
| Diskfin | Water | Tall, narrow disk body and upper/lower fins | Cruise |
| Abyss angler | Water | Broad head, filter port, light-colored lure cluster | Cruise |
| Ray skimmer | Water | Flat body and broad continuous foils | Cruise with foil waves |
| Paddleback | Water | Low armored body and four phased paddles | Row |
| Sailwing | Air | Long feather fans and a steering tail | Soar |
| Glass dart | Air | Four narrow veined wings and long abdomen | Flutter |
| Velvet moth | Air | Four broad marked wings | Flutter |
| Sky medusa | Air | Ribbed float envelope, vanes, and streamers | Float |
| Cave kite | Air | Compact body and broad webbed wings | Power flight |
| Gyre seed | Air | Rotating three-leaf crown and root fringe | Float / rotor motion |
| Wind ribbon | Air | Long body and two small wing pairs | Soar with vertical body wave |
| Lantern beetle | Air | Split wing case and separate hind wings | Flutter |

Every new model has a distinct body-node graph. The new shapes do not depend on a recolor of an existing ground walker. They still share reusable part factories.

In the Workshop, select **Models**, then use the **All / Ground / Water / Air** filter. The filter is separate from text search. In the Inspector, open **All 53 blueprint sources** to load a complete source, or select one of the six new foundation templates.

## Fifteen new part families

| Part | Three shape choices |
| --- | --- |
| Propulsion tail | Fork, crescent, round |
| Webbed paddle | Flipper, webbed, lobed |
| Pulsing bell | Dome, crown, lantern |
| Coiled shell | Nautilus, ammonite, tower |
| Ribbon fin | Long, forked, comb |
| Ray foil | Manta, skate, leaf |
| Feather wing | Soarer, raptor, rounded |
| Veined wing | Dragonfly, moth, lace |
| Steering fan | Fork, fan, streamers |
| Seed rotor | Three blades, two blades, whorl |
| Split wing case | Beetle, ribbed, faceted |
| Float sac | Long, round, cluster |
| Flush eye | Round, slit, compound |
| Feeding port | Funnel, snout, filter |
| Arm crown | Threads, arms, fringe |

Size, length, bend, twist, flex, phase, presence, material class, host, and symmetry use the existing part contract. Twist can turn a vertical tail into horizontal flukes. A part remains an ordinary editable gene after a kit is added.

The six new kits are **Pelagic, Medusa, Ray, Feather flight, Four-wing, and Aerostat**. Adding a kit is one undo step. The rear wing pair in Four-wing has a half-cycle offset. Kits preserve that phase and check the gene limit before changing the source. A kit adds parts; it does not change travel medium or silently select a movement recipe.

New parts can also use the existing humanoid sockets in the game runtime. The offline humanoid reviewer still excludes attachment genes, so do not use that view as proof of a complete winged humanoid.

## Motion and body deformation

The eight new motion recipes are **Cruise, Undulate, Jet, Row, Soar, Power flight, Flutter, and Float**. Blend their weights in the Motion inspector. Existing breathing, blinking, gaze, jaw, tail, and flex gains remain.

Motion is not one shared flap applied to every appendage. A bell contracts its rim. Paddles have a stroke and folded return. Foils have a travelling edge wave. Feathers rotate as fans and bend at their tips. Veined wings use a faster stroke. Wing cases open on separate hinges. Seed crowns rotate. Arm crowns carry travelling curls.

The separate body deformation setting has four choices: **Rigid, Lateral wave, Vertical wave, and Pulse**. Amplitude, frequency, and wavelength are stored in the blueprint. The humanoid skeleton does not use this field.

Every sample starts from immutable rest vertices. Time scrubbing does not accumulate mesh changes. Attachment positions and normals follow the same body deformation. Mirrored geometry reflects both the shape and the animation. The checker found and corrected a local mirror error in curved fins and wings during this delivery.

Geometry deformation does not deform the collision hull. Model changes can regenerate topology; they are not fixed-topology morph targets. These routines are CPU vertex operations with normal updates. No GPU animation, crowd instancing, automatic LOD, or performance target is claimed.

## Travel modes and habitat trial

**Ground** retains the existing upright creature controller. **Water** and **Air** use a separate three-axis velocity controller. The selected model opens a reef tank or sky course. The eight spores are placed at different heights.

| Control | Water or air action |
| --- | --- |
| WASD or arrows | Move in the camera-relative horizontal plane |
| Space or E | Rise |
| Q or Control | Descend |
| Shift | Horizontal speed boost |
| R | Return to the starting position; retain collected spores |
| Escape | Return to the Workshop |

Cruise speed, vertical speed, and visual bank are adjustable. The controller brakes when input stops. Soft height and radius limits keep the target inside the test volume. Water and air use different response gains. The actor speed multiplier still applies to horizontal target speed.

This is an **arcade controller**, not a fluid or aerodynamic solver. It does not calculate buoyancy, water displacement, lift, drag from wing area, stall, or fin thrust. Water and cloud shapes are scenery. The player has a stabilized, upright compound rigid body. It turns in yaw; visible bank is an animation. There is no free pitch/roll flight or physical articulation of wings and fins. New appendages have no individual collision shapes. A swim or flight model does not add AI, navigation, combat, or a flocking system.

The Rapier implementation is included, but it did not run in the delivery environment. See the verification section before using it as a tested gameplay dependency.

## Surface options

The eight new patterns are **cycloid scales, chromatophore patches, feather barbs, eye spots, light rows, shell growth, wing veins, and current bands**. Up to four active layers retain independent weight, scale, angle, and warp.

New generated microtextures are **denticles, feather, down, lamellae, growth rings, and wing mesh**. They use the existing seeded texture generator. Microtexture bump is applied to the existing skin and cloth paths; not every material class has the same bump behavior.

The twelve material recipes are **Pelagic, Eel hide, Jelly, Nacre, Tropical, Abyssal, Ray hide, Tidal armor, Plumage, Wing film, Moth dust, and Seed husk**. These recipes combine pigment and material settings. Names such as Jelly, Nacre, and Wing film do not imply refraction, true transparency, thin-film optics, or physical iridescence. Light rows is a pigment pattern. Emission is not a light simulation.

The new part adapter uses double-sided materials so that open fins, wings, and hollow shells can be seen from below. Appearance changes refresh these materials without rebuilding the source geometry.

## Inspection and visual evidence

The offline Inspector now draws all new body surfaces and all new attachment families on creature rigs. The 16 new models use only these supported attachment factories, so their complete new gene sets are visible with **Details** enabled. Legacy creature attachments and humanoid attachment genes remain excluded. The excluded-gene count and report state this limit.

Use **motion-cycle**, then move **Pose phase**, to sample the actual body and parts over a two-second window. The pose sheet exports eight frames from 0.00 to 1.75 seconds. The separate motion sample GIF repeats those eight samples; it is not a seamless baked animation.

The new default views for these models are front, right, top, and raised three-quarter. One frame is used for an A/B comparison. A model's phase sheet also uses one frame across the sequence. The library contact sheet fits each model separately and must not be used to compare absolute body sizes.

**Procedural pigment (CPU sample)** shows an approximate vertex-color version of the patterns. It does not reproduce GPU lighting, roughness, bump, shadows, emission, or transparency. Clay, silhouette, normals, wire, flat pigment, and edge distortion remain available.

Use a pinned source to compare a change. Check more than one view and phase. A technical pass does not approve silhouette, anatomy, mesh intersections, or suitability for a game. The Inspector never changes manual decisions to accepted because a test passed.

## Mixing, migration, and export

The five mixer channels remain **Body, Parts, Pigment, Surface, and Motion**. Source snapshots, channel locks, Apply, Cancel, and repeatable seeded variation remain.

The Motion channel now includes travel and body-wave data. Numeric settings interpolate. Travel medium and body-wave kind switch at the midpoint; they do not become hybrid physical systems. Cross-medium mixes show a note. Lock Motion to preserve the current travel recipe while mixing appearance or anatomy.

Schema 6 imports versions 1–5. Missing travel values become Ground; missing body-wave values become Rigid. Old model files therefore keep ground-controller behavior. The new v6 save slots read older slots as a fallback without overwriting them. Unknown future schemas and invalid travel values are rejected.

Blueprint, mixer recipe, actor manifest, roster, and review-session exports retain the new data. Actor manifests include the travel and deformation contract. Role and behavior fields are still integration metadata, not executed AI. The 120 example files include 90 blueprints, 12 mixes, 10 actor manifests, four rosters, and four review sessions.

## Extension boundary

`src/core/tidal-catalog.js` contains part and model metadata. `tidal-presets.js` contains source recipes. `tidal-geometry.js` creates typed arrays and samples animation. `creature/tidal-parts.js` is the Three.js adapter. The Inspector consumes the same typed-array source. Do not write a second visual approximation for new parts.

A minimal engine-independent sample from the project root:

```js
import { preset } from './src/core/genome.js';
import { analyze } from './src/core/anatomy.js';
import { sampleMotion } from './src/core/motion.js';
import { compileTidalPart, sampleTidalPart } from './src/core/tidal-geometry.js';

const genome = preset('glassdart', 4616);
const part = analyze(genome).parts.find(p => p.type === 'insectwing');
if (!part) throw new Error('The selected source has no veined wing.');

const plan = compileTidalPart(part);
const pose = sampleMotion(genome.motion, { preview: true });
let frame = sampleTidalPart(plan, 0, pose);
frame = sampleTidalPart(plan, 0.25, pose, frame); // Reuse frame buffers.
// Each component contains local positions, normals, indices, UVs, and material.
// Apply the part's resolved mount transform before drawing in world space.
```

To add a family, register its metadata and geometry, add a source example, and test finite arrays, symmetry, serialization, time seeking, and inspection coverage. Then test the actual engine adapter and shaders on a machine with WebGL2. Source inspection is not a substitute for that last step.

## Run and test

From the extracted source folder:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use `http://localhost:3000/?review=1` for the unbundled inspector. Installed engine packages are served locally.

Core, build, and CPU evidence:

```bash
npm test
npm run build
npm run examples
npm run examples:tidal
npm run test:examples
npm run review:tidal -- --render
python scripts/tidal-gallery.py
```

The gallery script needs Pillow. Browser suites need Python Playwright and Chromium. Set `CHROMIUM_PATH` when the browser is not at `/usr/bin/chromium`.

```bash
npm run test:ui
npm run test:review-ui
npm run test:navigation-ui
npm run test:tidal-ui
```

Actual engine and GPU tests require the pinned packages and suitable graphics support:

```bash
npm run test:engine
npm run test:humanoid-engine
npm run test:content-engine
npm run test:review-engine
npm run test:tidal-engine
npm run test:shaders
npm run test:review-gpu
npm run build -- --offline
```

`--offline` must embed the installed engines or fail. It does not silently produce a CDN build. `dist/runtime.html` is a test artifact. Use the combined release entries instead.

## Delivery verification and retained limits

**Passed:** 586 core tests; 147 editor controls checks; 71 offline reviewer checks; 27 combined-navigation checks; 57 new-content browser checks; all 120 example files. The core mixer regression covers 14,045 source-pair/weight combinations inside its tests.

The new model batch drew 128 PNG samples: 120 technical passes, eight warnings, no technical failures, no omitted attachment genes, and no clipped images. All eight warnings concern the Abyss angler's small arm crown. Its edge-distortion diagnostic exceeds the threshold. Do not silently accept this model for large deformations. The report retains each warning.

**Not verified:** actual Three.js adapter rendering, GPU shader compilation, Rapier travel, complete gameplay, and an engine-embedded offline build. Package installation failed with `EAI_AGAIN` for the npm registry. The test Chromium did not provide WebGL2. The engine suite could not load `three`.

Direct `file://` navigation was blocked by the browser environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. The exact packaged HTML and its buttons were exercised through Playwright `set_content`. Direct Windows file launching is not claimed as verified.

The CPU previews show generated models, not concept art or replacement illustrations. Visual spot checks were made, but no asset is marked as production-approved. These models still need art review, collision checks, engine testing, and optimization for the target game.
