# Inspect

The Inspector draws the generated triangles of any model with a CPU depth buffer and Canvas 2D. It needs no engine, server or network. Use it to check a model's silhouette, proportions, poses and deformation before you reuse it, and to export review records and assets.

The Inspector is a separate review tool. It does not replace the Workshop's Three.js/WebGL2 renderer, and a technical pass here is never a visual, GPU or gameplay approval.

## Open

- Release: select **Inspect** in the header of `dist/Morph-Lab.html`, or add `?review` to its URL.
- Source: run `npm run dev` and open `http://localhost:3000/?review=1`.

Switching workspaces keeps the source, candidate, pinned baseline, camera, pose settings, notes and decisions. Decisions reset if the blueprint changed while you were away. Reference images and OBJ references are not kept; load them again. Export the blueprint and review session before closing the file.

## Sources

| Source | Notes |
|---|---|
| Foundation templates | 24 inspection templates derived from library models. Six are plain on purpose: the balanced, compact, heavy and long-limbed bipeds have no attachments and use the defined construction, a bare head, a simple wrap and finger hands; the walker and crawler bodies keep only their legs. The other 18 (swimmers, fliers, crawlers, a four-paw companion and an equipped field worker) keep all their parts. |
| **All 89 blueprint sources** | Every library model. The content filter offers All models, Completed: original models, Field & Settlement, Carapace & Bloom, Strange Forms, Water and Air. |
| **Import blueprint** | Any valid `.morph.json` file. |

**Completed: original models** lists the 24 original presets that once lacked complete offline geometry. Mossback, Glider, Tendril and Fiend are good starting points.

## Inspection procedure

1. Select a source. Select **Pin candidate as baseline** before you change it.
2. Check front, right, back and three-quarter views in **Clay**. Use **Silhouette** to judge shape without surface detail.
3. Select **A / B + difference**. Use **Fit both once** only when needed; both subjects share one camera scale and centre.
4. Change a shape profile or proportion. Check the diagnostic poses. Turn on **Edge distortion**, **Bones** and **Sockets** where useful.
5. Select **Run proportion spot checks**. Record defects in the checklist and notes. Export the blueprint, review session, PNG sheets and audit JSON.

## Shape profiles and proportions

Five shape profiles derive a humanoid from a fixed source: Compact adventurer, Tall explorer, Heavy guardian, Nimble scout and Stylized companion. **Source proportions** leaves the source unchanged. A blend of zero returns the original, and repeated changes do not accumulate.

The eleven proportion controls are scale, torso length, shoulder width, hip width, arm length, leg length, head size, body mass, hand size, foot size and forward posture. Posture is an animation setting: it does not change the bind pose, and diagnostic poses apply it as a spine offset.

Proportion changes regenerate the body surface and skin weights, so vertex counts and triangle indices can change. They are recipe-derived variations, not topology-preserving morph targets. Creature body nodes are edited directly in the Workshop; the profiles require a humanoid.

### Body construction

Humanoids have two body constructions, set with `rig.bodyStyle` (or **Actor → Body construction** in the Workshop):

- **defined**: a narrower surface blend, a higher head centre and a derived neck support field. The head and jaw read separately from the chest.
- **classic**: the original broad soft blend. Schema 1–4 humanoids import as classic.

Both keep four structural body nodes and 22 bones; the neck support is not an extra gene or bone. The game and the Inspector use the same field.

## Layouts and display modes

Layouts: **Four views**, **A / B + difference**, **Image reference**. Four views uses front, right, back and three-quarter, or front, right, top and raised three-quarter for models with attachment parts.

| Display | Shows | Does not show |
|---|---|---|
| Clay | Generated form under fixed simple lighting | Game materials |
| Silhouette | Filled visible outline | Internal topology or depth |
| Normals | Mesh normal directions as color | Tangent-space normal maps |
| Wire | Triangle-edge overlay | A welded, continuous actor mesh |
| Flat pigment | Material-class colors | Patterns, roughness, relief, emission or shader output |
| Procedural pigment (CPU sample) | Approximate vertex-color patterns | GPU lighting, bump, shadows, emission or transparency |
| Edge distortion | Edge stretch or compression against bind geometry | Collision, strain limits or retargeting safety |

Toggles: **Bones**, **Sockets**, **Garment**, **Details** (attachment parts).

Cameras are orthographic: Front (+Z), Right (+X), Back (−Z), Three-quarter, Raised three-quarter and Top (+Y). Units are metres, +Y up, +Z forward.

In A/B mode, A is the candidate and B is the pinned baseline (or an OBJ reference). The frame holds until you fit again. Blue pixels are A-only, orange are B-only, gray is overlap. The overlap value is intersection over union: it measures aligned shape change, not quality. A clipping warning means the image cannot be used to judge overlap.

## Poses and motion

The diagnostic poses are bind, A-pose, T-pose, reach, twist, crouch, stride, wave, cast and sit. Wave, cast and sit reuse the action recipes. The eight-pose sheet uses bind, T-pose, reach, twist, crouch, stride, wave and sit in one fitted frame.

**motion-cycle** samples the actual body and parts with **Pose phase**:

- Creatures, and humanoids with No action, use a two-second window.
- For humanoids, choose **Humanoid action** and **Action mask** (Action default, Upper body, Full body). Phase 0–1 then covers one full action, adjusted for action speed. Both controls edit the candidate and clear manual decisions.
- With motion-cycle selected, **Pose sheet** exports eight frames of the cycle. Captions and the audit include the sample time in seconds.

Diagnostic poses sample the rig directly. They do not reproduce terrain-aware IK, secondary animation or cloth; the Workshop animator remains the final integration check. In an A/B comparison each blueprint uses its own action clock at the selected phase.

**Run proportion spot checks** changes one proportion at a time and checks both ends of all eleven ranges (22 cases) at the current pose, phase and budget. It does not change the candidate and is not a search of all combinations.

Edge distortion is the greater of posed/rest edge length and its reciprocal; 1 means unchanged. The report includes the 95th percentile and the maximum. Large values are prompts for inspection, not automatic rejection. Rigid details have no skin stretch but their joints still need a visual check.

## Technical checks

The audit checks finite positions and normals, valid triangle indices, skin-weight normalization and bone indices, zero-area body triangles, connected body components, body boundary and non-manifold edges, triangle and mesh budgets, and posed edge distortion.

Topology checks cover the implicit body only. Garments are intentionally open, and separate limb, face and equipment meshes do not form one watertight asset. There is no self-intersection or garment-collision test.

| Budget | Triangles | Meshes |
|---|---:|---:|
| Desktop prototype | 100,000 | 150 |
| Mobile draft | 25,000 | 60 |
| Crowd draft | 10,000 | 24 |

These are draft warning budgets, not platform guarantees. Mesh count is not a measured draw-call count.

### Coverage and inactive genes

All 73 part families use shared geometry, so with **Details** on the Inspector draws every active attachment gene on both rig families. A gene can still be **inactive**:

- its presence is at or below 0.005, so it emits no part, or
- it is an original walker `leg` gene on a humanoid, whose rig supplies its own two legs.

Inactive genes stay in the blueprint. The Inspector, audit and delivery manifest name them with the reason; they are not reported as missing implementations. Hiding **Details** excludes attachments from the view and reports the excluded count.

## Manual review

The checklist has six items: silhouette at game size, proportions for the role, joints in test poses, surface and material in the game, attachments in the complete runtime, and physics and gameplay. Each is unreviewed, accept or revise. No technical check sets a decision.

Any blueprint edit clears all decisions. A saved fingerprint ties decisions to one blueprint. It is a noncryptographic change identifier, not a signature.

Review sessions also record the geometry implementation (`implementation: "morph-lab-shared-geometry-11"`). When a loaded session has no marker or a different one, its decisions are cleared and the Inspector says why; the source, candidate, baseline, camera, settings and notes are kept. This is a version check, not tamper protection. Change the marker in `src/review/session.js` whenever shared geometry or diagnostic pose behaviour changes.

## References

**Load local image** accepts PNG, JPEG or WebP up to 8 MB and 8,192 pixels per side. Adjust opacity, scale and X/Y shift, and use a matching view and pose. A concept image is a design target; it proves nothing about the mesh.

**Load OBJ reference** accepts a static triangle mesh (convex polygons are triangulated) up to 8 MB, 200,000 vertices and 300,000 triangles. Coordinates are used as-is: prepare it in metres, +Y up, +Z forward, with a matching origin. Materials, textures, skeletons and animation are ignored, and the mesh is not deformed by the proportion controls.

Reference bytes are never uploaded or embedded in a review session. The audit report records image metadata and alignment so you can restore them.

## Exports

| Output | Contents |
|---|---|
| `.morph.json` | The editable schema-6 blueprint |
| `.review.json` | Source, candidate, pinned baseline, frame, settings, lineage, notes and manual decisions |
| `.review-report.json` | Review session, current audit, comparison data, scope, limits, reference metadata and optional sweep |
| `-proportion-sweep.json` | Proportion spot-check results |
| `.png` sheets | Four views, a pose sheet, or an A/B comparison |
| `.obj` | Current posed triangles only: no UVs, bones, materials, skin weights or animation |
| Library coverage JSON | Model roles, travel groups, part usage and coverage (**Export library coverage**) |
| GLB asset package | **Export asset**; see [export.md](export.md) |

The review-session format is version 1, separate from the blueprint schema.

## Full-runtime capture

In the Workshop, **Capture runtime review sheet** and **Export runtime review record** build a separate temporary creature, sample the real game animator, and capture four orthographic views with game materials and all active attachments. The live creature is untouched. The `.runtime-review.json` record stores the blueprint, fingerprint, time, cameras and triangle/draw-call counters. It needs the engines and WebGL2, and it is not an approval.

## Headless review

`scripts/review.mjs` runs the same compiler and audit from Node with no browser or engine:

```sh
node scripts/review.mjs                                          # all foundation templates
node scripts/review.mjs --foundation balanced --render --out ./my-review
node scripts/review.mjs --catalog --render                       # every library model
```

| Flag | Effect |
|---|---|
| `--foundation ID` | Check one template instead of all |
| `--catalog` | Check every library model instead of the templates |
| `--render` | Also write 512-pixel three-quarter PNGs |
| `--out DIR` | Output directory (default `test-results/review/foundation/`) |

Humanoids are checked in all ten diagnostic poses; creatures in bind. Each source uses one frame across its images. The command writes `report.json` and exits nonzero on a hard technical failure. Warnings are reported, never approved.

`scripts/catalog-review.mjs` audits library models at eight motion-cycle phases each:

| Flag | Effect |
|---|---|
| `--collection NAME` | `all` (default), `tidal`, `frontier`, `bloom` or `field` |
| `--render` | Also write a PNG per model and phase |
| `--out DIR` | Output directory (default `test-results/review/<collection>/`) |

Each model is fitted separately and keeps one frame across its phases. It writes `report.json` and exits nonzero on a technical failure.

`scripts/surface-swatches.mjs` renders surface recipes as CPU pigment swatches with their height maps (`--collection frontier|bloom|field`; default all three) into `test-results/swatches/<collection>/`.

### From code

```js
import {FoundationCompiler, foundationBlueprint, deriveFoundation}
  from './src/review/foundation.js';
import {auditSnapshot} from './src/review/audit.js';

const source = foundationBlueprint('balanced');
const recipe = deriveFoundation(source, 'heavy', 0.6);
const compiler = new FoundationCompiler(recipe);
const geometry = compiler.sample({pose: 'reach', phase: 0.7});
const report = auditSnapshot(geometry, 'desktop');
// report.technicalStatus does not approve visual quality.
```

In the browser, `window.foundationReview` exposes read-only snapshots, audits, render statistics, geometry and reports; `setSource()` accepts a validated recipe. No code runs from imported JSON.

## Known warnings

- **Abyss angler**: the small arm crown exceeds the edge-distortion threshold in all eight motion-cycle phases.
- **Revenant**: crouch poses exceed the edge-distortion threshold.

These are retained warnings, not fixed. Inspect these models before using them with large deformations.
