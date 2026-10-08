# Morph Lab v5 — Foundation Studio

## Purpose

Inspect a generated foundation before you use it to make many actors. Keep a fixed source. Change its proportions. Check its silhouette and test poses. Export the recipe and the inspection record together.

The review images contain actual generated triangles. They are not AI illustrations of a better model. The game remains a Three.js r181 and Rapier 0.19.3 application with a WebGL2 renderer. The new CPU renderer is a separate inspection tool. It does not replace the game renderer.

## Open the tool

Open **Morph-Lab-v5.0.1.html** directly in a browser (or `dist/Morph-Lab-Review.html` in the source archive). This file works offline. It needs no engine download, server, API key, or account. It uses Canvas 2D to display a depth-buffered triangle render.

For the full game, open **Morph-Lab-v5.html** with internet access, or run the source:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Select **Inspect** in the top bar. In development mode, the current blueprint transfers through session storage. In the combined release HTML, both workspaces are included and switch in place. No second HTML file is required. The launcher keeps the current blueprint and review record in memory during a switch. Local reference images and OBJ data are not kept; load them again on return. Export your blueprint and review session before closing the file. A blocked storage write in development mode does not navigate away from unsaved work.

Without engine packages, run `npm run dev` and open `http://localhost:3000/review.html`, or use the offline HTML directly. The game can show a link to the reviewer if engine initialization fails.

A new workshop starts with the defined balanced biped when no saved blueprint exists. Existing saves and old model recipes keep their original construction.

## A repeatable inspection procedure

1. Select a foundation, a model recipe, or a local blueprint. Use **Pin candidate as baseline** before you change it.
2. Inspect front, right, back, and three-quarter views in **Clay**. Use **Silhouette** to check shape without surface detail.
3. Select **A / B + difference**. Use **Fit both once** only when needed. The two subjects use one camera scale and one center.
4. Change a shape profile or a proportion. Check reach, twist, crouch, stride, wave, and sit. Use **Edge distortion**, **Bones**, and **Sockets** when needed.
5. Run **proportion spot checks**. Record visible defects in the checklist and notes. Export the blueprint, review session, PNG sheets, and audit JSON.

The checklist is manual. A technical pass never marks a model as accepted. Any blueprint edit clears all six decisions. Full acceptance requires explicit decisions for silhouette, proportions, joints, game surfaces, complete attachments, and gameplay. A saved fingerprint ties those decisions to that blueprint. The fingerprint is a noncryptographic change identifier, not proof of authorship or a secure signature.

## Foundations and derivatives

Six inspection templates are included: balanced, compact, heavy, and long-limbed bipeds; walker body; and crawler body. They derive from the existing model library. They are not six unrelated finished assets.

The four biped templates use the new **defined** construction, bare heads, simple wraps, and finger hands. Decorative attachment genes are removed from these inspection templates. The two creature templates retain leg genes in their exported recipes, but the CPU reviewer draws only their body surface.

Five shape profiles derive from a fixed source: compact adventurer, tall explorer, heavy guardian, nimble scout, and stylized companion. **Source proportions** is the unchanged option. A blend of zero returns the original source. Repeated profile changes do not accumulate mutations.

The eleven controls are scale, torso length, shoulder width, hip width, arm length, leg length, head size, body mass, hand size, foot size, and forward posture. Posture is an animation setting. It does not change the bind pose. Diagnostic poses use it as a spine offset; the full game applies its own motion rules.

**Proportion changes regenerate the body surface and skin weights. Vertex counts and triangle indices can change. These are recipe-derived variations, not topology-preserving morph targets.** Imported OBJ vertices are not part of this procedural rig.

## A model correction found through inspection

The original humanoid field used a broad soft blend. In the inspected balanced body, this blend merged the head with the chest and hid much of the jaw. A count of valid triangles did not reveal this visual problem.

The new **defined** option uses a narrower surface blend, a higher head center, and a derived neck support field. The game and the reviewer use the same field. Head attachments project onto that same surface. The model still has four editable structural nodes and 22 bones. The neck support is not an extra gene or bone.

The **classic** option retains the old body field and head placement. Schema 1–4 humanoids import as classic when the field is absent. The existing 37 model recipes remain available. Use **Actor → Body construction** in the workshop to switch a humanoid. The edit has an undo step.

The supplied comparison PNG shows classic and defined construction at one camera scale. The new outline has a distinct head and neck. The pose sheet still shows separate joints and simple limbs. This is a stylized modular foundation, not a finished anatomical character. No production approval is included.

## Display modes and cameras

| Mode | What it shows | What it does not show |
| --- | --- | --- |
| Clay | Generated form under fixed simple lighting | Final game materials |
| Silhouette | Filled visible outline | Internal topology or depth quality |
| Normals | Mesh normal directions mapped to color | Tangent-space game normal maps |
| Wire | Triangle-edge overlay | A welded, continuous actor mesh |
| Flat pigment | Material-class colors | Patterns, roughness, relief, emission, or shader output |
| Edge distortion | Edge stretch or compression against bind geometry | Collision, strain limits, or retargeting safety |

Front looks from +Z, right from +X, and back from −Z. The three-quarter view uses fixed yaw and pitch. A top camera is also available in comparison and reference layouts. All cameras are orthographic. Units are metres; +Y is up; +Z is forward.

A/B comparison holds its frame until you explicitly fit again. A clipping warning means you must not judge overlap from that image. Fully out-of-frame geometry also triggers a warning.

Blue means candidate-only silhouette pixels. Orange means baseline-only pixels. Gray means overlap. The overlap value is intersection divided by union. **It measures aligned shape change, not model quality. A higher percentage is not necessarily better.** A deliberate redesign should often have a different outline.

## Pose and deformation checks

The ten diagnostic poses are bind, A-pose, T-pose, reach, twist, crouch, stride, wave, cast, and sit. The eight-pose PNG sheet uses bind, T-pose, reach, twist, crouch, stride, wave, and sit. It uses one fitted frame across the sheet.

These poses sample the semantic rig directly. Wave, cast, and sit reuse the action recipes. The diagnostic layer does not claim to reproduce full game locomotion, terrain IK, secondary animation, or cloth behavior. The game animator remains the final integration check.

The range sweep changes one proportion at a time. It checks both ends of all eleven ranges: 22 cases. It keeps the current pose, phase, display scope, and budget. It does not change the current actor. It is not a search of every parameter combination. New settings require a new sweep.

Edge distortion uses the greater of posed/rest edge length and its reciprocal. A value of 1 means unchanged length. The report includes a 95th percentile and a maximum. The display highlights values above 1. Large values are warnings for inspection, not automatic rejection. Pure rigid details have no skin stretch; their joints still need visual inspection.

## Technical checks

The audit checks finite positions and normals, valid triangle indices, skin-weight normalization and bone indices, zero-area body triangles, connected body components, body boundary/nonmanifold edges, triangle and mesh budgets, and posed edge distortion.

Topology checks cover the implicit body only. The garment is intentionally open. Separate limb, face, and equipment meshes do not form a single watertight asset. No self-intersection, garment collision, or full assembled-mesh watertightness test is included.

The desktop, mobile, and crowd limits are draft budgets. They are not platform guarantees. Mesh count is not a measured draw-call count. The runtime sheet records actual rendering counters when the real WebGL2 path runs.

## Reference images and assets

**Image reference** accepts local PNG, JPEG, or WebP files. The limit is 8 MB and 8,192 pixels on either side. Adjust opacity, uniform scale, and X/Y shift. Use a matching view and pose. The image remains separate from the generated geometry. It is not a texture replacement.

A generated concept image can be loaded here, but it remains a design target. It does not prove that the mesh has correct geometry, topology, rigging, or animation. There is no image-generation service or automatic aesthetic model in this tool. No reference file is uploaded to a server.

**OBJ reference** accepts a static local triangle mesh, with convex polygon triangulation. Limits are 8 MB, 200,000 vertices, and 300,000 triangles. Coordinates are preserved. Prepare the asset in metres, +Y up, +Z forward, with the same origin before import. The viewer does not normalize the asset to the candidate or silently hide size differences. There is no OBJ transform editor in this release.

OBJ references have no imported material library, textures, skeleton, or animation. They are not deformed by the humanoid controls. OBJ export contains the current posed foundation triangles only: no UVs, bones, materials, skin weights, or clips. Use blueprint export to keep procedural editability.

Reference image and OBJ bytes are not embedded in a saved review session. Reload local references after opening a session. The audit report records image metadata and alignment values for manual recovery. There is no image-to-mesh conversion, automatic rigging, or animation retargeting.

## Two inspection paths

### Offline geometry path — verified in this delivery

The CPU compiler and the game adapter share the implicit body mesher, skeleton data, skin weights, garment generator, and the humanoid detail plan. The review adapter transforms these buffers and rasterizes actual triangles with a depth buffer. It does not draw idealized replacement figures.

Humanoid review includes body, garment, rigid limbs, hands, and face details. **All attachment genes are excluded**, including equipment, horns, and tails. The count is visible. Creature review includes only the implicit body. Creature limbs and all other attachment genes are excluded. Blueprint export preserves genes even when the reviewer does not draw them.

### Full runtime path — implemented, not verified in this delivery

The workshop has **Capture runtime review sheet** and **Export runtime review record** buttons beside the camera tools. They create a separate temporary creature, sample the actual game animator, and capture four orthographic views with game materials and all active attachment meshes. The live editor creature is not reparented or restyled. The renderer state is restored and the temporary resources are disposed.

The runtime record stores the exact blueprint, fingerprint, time, cameras, and triangle/draw-call counters. The record does not assert visual approval or physics verification. It is a separate evidence file from the CPU report.

This environment had no WebGL2 context and could not fetch the engine packages. Therefore, the Three adapter tests, GPU capture, material shaders, and Rapier gameplay were not verified. Their test commands are included and fail clearly when the required runtime is absent.

## Export formats

| Output | Keeps |
| --- | --- |
| `.morph.json` | Validated schema-5 editable actor recipe |
| `.review.json` | Source, candidate, pinned baseline, frame, settings, lineage, notes, manual decisions |
| `.review-report.json` | Review session, current audit, comparison data, scope, limits, reference metadata, optional sweep |
| `.png` sheets | Four views, eight poses, or front/quarter A/B comparisons |
| `.obj` | Current posed foundation triangles only |
| `.runtime-review.json` | Full-game capture recipe and renderer measurements, when captured |

Schema 5 imports schema 1–4. The new `rig.bodyStyle` field is `classic` or `defined`. New blueprint and mixer browser slots use v5 keys and read older slots as fallbacks. Existing v4 slots are not overwritten. Review-session format is separately versioned at 1.

## Headless review and integration

No engine install is required for the core tests or headless reviewer:

```bash
npm test
npm run review:batch -- --render
npm run review:batch -- --foundation balanced --render --out ./my-review
npm run review:batch -- --catalog
```

The default batch checks six foundations and 42 diagnostic samples. `--render` adds real 512-pixel PNG views. Each source keeps one frame across its poses. The report includes scope and source recipes. `--catalog` checks all 37 model sources within the limited foundation scope. A hard technical failure returns a nonzero exit status. Warnings remain explicit; no image is approved automatically.

```js
import {FoundationCompiler, foundationBlueprint, deriveFoundation}
  from './src/review/foundation.js';
import {auditSnapshot} from './src/review/audit.js';

const source = foundationBlueprint('balanced');
const recipe = deriveFoundation(source, 'heavy', 0.6);
const compiler = new FoundationCompiler(recipe);
const geometry = compiler.sample({pose: 'reach', phase: 0.7});
const report = auditSnapshot(geometry, 'desktop');
// Send the typed arrays to another renderer, or save the recipe and audit.
// report.technicalStatus does not approve visual quality.
```

The browser exposes `window.foundationReview` for read-only snapshots, audits, render statistics, geometry access, and reports. `setSource()` accepts a validated recipe. No model code runs from imported JSON. The headless command is the preferred stable route for automated spot checks.

### Extend the system

Change `core/foundation-shapes.js` to add shared humanoid details. Both game and review consume the same plan. Add a new primitive in both the plan registry and its shared buffer generator. Add a test that checks finite data and correct indices.

Add a supported rig by creating a pure skeleton, layout, skin-weight function, and foundation compiler adapter. Do not label an unsupported rig as verified because it can display a static mesh. Keep an explicit coverage statement.

Use a reviewed source recipe to derive game-specific roles. Keep visual acceptance, gameplay tests, and budget measurements in separate records. Re-run the fixed views after a change to geometry code, even when the blueprint fingerprint stays the same. The current fingerprint identifies recipe data; the report's generator version identifies the review implementation. It is not a full source-code hash.

## Verification commands

```bash
npm test
npm run examples
npm run test:examples
npm run build:review
npm run test:review-ui
npm run build -- --cdn
npm run test:ui
```

Browser tests need Python Playwright and Chromium. They do not depend on GPU support for the CPU reviewer. Use `CHROMIUM_PATH` to select a browser binary.

After engine installation, also run:

```bash
npm run test:engine
npm run test:humanoid-engine
npm run test:content-engine
npm run test:review-engine
npm run build -- --offline
npm run test:review-gpu
```

The game engine pins remain Three.js `0.181.0` and `@dimforge/rapier3d-compat` `0.19.3`. The offline reviewer has no third-party runtime dependency. All built-in shapes and test references are procedural; no font files or external character assets are bundled.

## Findings from this release

The supplied before/after sheet shows the corrected head and neck. The foundation overview shows four biped proportions and two creature body surfaces. The pose sheet exposes the remaining modular-joint seams. In the heavy biped, inspect the garment/waist junction before reuse. These images are spot checks, not production approvals.

The six-template batch contains 42 pose samples. All 42 pass the specified technical checks. The 37-source catalog batch contains 190 samples: 189 pass and one has a warning. Revenant in crouch has a maximum body-edge distortion ratio of approximately 4.37. Check that pose visually in the intended game renderer. A large ratio can be caused by local compression as well as stretch.

The default balanced biped has 40,248 triangles and 53 visible meshes in the review scope. It passes the draft desktop budget, but not every smaller budget. Mesh count is not a measured game draw-call count. No automatic level-of-detail system or mesh merging was added.
