# Export assets

The asset exporter turns a blueprint into a GLB model, optionally with baked motion, inside a checked package that keeps the editable source. It runs offline in the browser and from the command line, with no engine.

Open it from **Inspect → Export asset**, **Create → Build GLB asset**, or **Workshop → Export asset**. Geometry comes from the shared CPU compiler that the Inspector uses, not from a capture of the WebGL2 Workshop. The blueprint remains the editable asset: regenerate after changing proportions, parts or actions.

## Build an asset

| Field | Choices |
|---|---|
| Asset type | **Static posed model** (one diagnostic pose and phase) or **Model + baked motion** (the source's procedural motion sampled from phase 0 to 1) |
| Pose, Pose phase | Static only: any diagnostic pose or motion-cycle, phase 0–1 |
| Motion samples | Motion only: 9 (8 morph targets, default), 17 (16) or 33 (32) |
| Mesh layout | **Group by material** (default here) or **Separate meshes** |
| Triangle / mesh budget | Desktop, Mobile or Crowd warning budget |
| Bake procedural pigment | On: CPU pigment baked to vertex colors. Off: flat material colors. |
| Allow technical warnings | Acknowledge warnings after reviewing them; failed checks still block |

Humanoid action settings come from the source blueprint. Clothing and details are always included, even if hidden in the Inspector view.

Select **Build asset package**. The job reports its current step and yields between mesh writes, motion samples and binary checks. **Cancel build**, or closing the dialog, stops it at the next yield; one compiler sample is synchronous, so cancellation is not instant. Then select **Download asset ZIP** or **Download GLB**.

The source is copied when the dialog opens. The job never changes the blueprint, baseline, notes or review decisions. Changing a setting clears the previous result.

More samples improve temporal sampling but raise file size, memory and importer requirements. Check the target engine's morph-target limits.

## Package contents

| File | Contents |
|---|---|
| `model.glb` | Indexed geometry, normals, linear vertex colors, standard metallic/roughness materials, optional sampled motion |
| `source.morph.json` | The complete editable blueprint |
| `manifest.json` | Source and settings hashes, coordinates, bounds, mesh and triangle counts, motion data, actor metadata, delivery limits, and the size and SHA-256 of the other four files |
| `audit.json` | Geometry checks for every sample, warnings, coverage, inactive genes and readback error |
| `README.txt` | Import and scope notes |

The ZIP uses STORE (no compression) and fixed timestamps, so identical source and settings produce identical bytes. CRC and SHA-256 detect corruption; they are not a signature or proof of authorship. The manifest does not list its own hash.

The GLB has no external references. It needs no Three.js, Rapier, network or Morph Lab runtime in a compatible glTF 2.0 application.

## Mesh layout

| Layout | Use |
|---|---|
| Group by material | Combines meshes that share a material class. Fewer meshes; same geometry. |
| Separate meshes | Keeps each source component as its own mesh node. Use it when the target must address, remove or animate components individually. |

Grouping keeps every vertex, triangle, normal, vertex color and motion sample. It does not weld, simplify, bake textures or change the blueprint, and it does not add sockets, a skeleton or LODs. The GLB node extras and the manifest carry a source-range map: each range records the original component name and its vertex and index range, so other tools can trace grouped triangles back to their source. The target engine does not split them back automatically.

Grouping reduces mesh count, not triangles or morph-target memory. Mesh count is not a measured draw-call count.

## Materials

Pigment is sampled on the CPU and written as linear vertex colors, with standard roughness, metalness and emissive values on double-sided materials. Enable vertex colors in the importer.

Fine pattern detail is limited by vertex density. Bump and normal textures, UV atlases, custom shaders, GPU shading, hair, translucency and cloth are not exported. The result is not an exact capture of Workshop materials.

## Animation

Each motion sample becomes a POSITION and NORMAL morph target relative to the first frame, and a glTF weight animation interpolates between them. Coordinates stay in the compiler frame: metres, +Y up, +Z forward, no automatic centering.

Creature motion and humanoid actions can be baked. There is no reusable skeleton, joint sockets, retargeting, root motion, terrain contact, collision shape, AI or combat. The actor profile in the manifest is metadata.

No loop is forced: the last frame is not made equal to the first. The manifest records the largest endpoint gap and `recommendedPlayback: "once"`; a matching endpoint still does not prove a smooth velocity transition. Configure looping in the target player.

## Export gates

**Coverage.** Every active gene must have shared CPU geometry. All 73 part families do, so all 89 library models are eligible. A blueprint with a part type that lacks shared geometry is blocked and the panel names the family; nothing is silently dropped. Eligibility is not approval.

**Inactive genes.** Genes with presence at or below 0.005, and walker legs on humanoids, emit no geometry. The manifest names them with reasons and records `allActiveGenesIncluded` and `allGenesIncluded` (false when inactive genes remain). Export keeps the complete source blueprint; it never deletes genes to pass a check.

**Technical checks.** Finite data, normal lengths, triangle indices, stable mesh names and stable topology across samples.

**Hard limits**, checked on the source geometry before grouping, so a compact layout cannot bypass them:

| Limit | Value |
|---|---:|
| Vertices | 200,000 |
| Triangles | 300,000 |
| Source meshes | 256 |
| Motion samples | 33 |
| GLB size | 64 MiB |

**Budgets.** Desktop, Mobile and Crowd are warning budgets ([inspector.md](inspector.md#technical-checks) lists the values). They do not simplify the model. The mesh warning uses the exported mesh count; triangle, topology, normal and deformation checks use the complete source. Warnings need acknowledgement; failed checks cannot be acknowledged away, and the audit keeps every warning.

**Readback.** Before a file is offered, the exporter reads its own GLB and compares every emitted pose with a fresh source sample. A position error above 0.00001 m blocks export. This does not replace an independent importer or the Khronos glTF validator.

## System checks

Open **System checks** from Inspect or the Workshop (also on the Workshop startup-error screen).

- **Check this browser** compiles a minimal WebAssembly module, requests a real WebGL2 context, and compiles and draws the procedural pattern GLSL when a context exists. It loads no engine.
- **Check engines + physics** also loads the pinned engines, renders Wayfarer, Trail hound, Moon bell, Glass dart and Mossback with shader-error and pixel-readback checks, and runs the Rapier Ground, Water and Air controllers through settle, movement, vertical travel and reset.

Each result is **pass**, **fail** or **blocked**. A missing engine, an unavailable context, or a test whose prerequisite failed is blocked, not passed. Each engine load or initialization stage times out after 15 seconds. Closing the panel stops at a test boundary.

**Export report** saves a local JSON file. It contains no model, save data, file path or account data, and nothing is uploaded. These are smoke tests, not frame-rate benchmarks or gameplay acceptance. Run them on the computer that will run the Workshop.

From the command line, `node scripts/doctor.mjs` reports whether the pinned engine packages are installed at the right versions (`--out FILE` writes the report). It does not render or run physics.

## Command line

```sh
node scripts/export-asset.mjs --preset moonbell --motion --frames 9 --out output/moon-bell
node scripts/export-asset.mjs --preset mossback --motion --layout material --out output/mossback
node scripts/export-asset.mjs --input my-creature.morph.json --pose crouch --phase 0.7 --out output/my-creature
```

| Flag | Meaning | Default |
|---|---|---|
| `--preset ID` or `--input FILE` | Library model ID, or a `.morph.json` blueprint (exactly one) | required |
| `--out DIR` | New output directory | required |
| `--motion` | Bake motion instead of a static pose | static |
| `--frames N` | Motion samples, 3–33 | 9 |
| `--pose NAME` | Static pose: `bind`, `a-pose`, `t-pose`, `reach`, `twist`, `crouch`, `stride`, `wave`, `cast`, `sit` or `motion-cycle` | `bind` |
| `--phase N` | Pose phase, 0–1 | 0.5 |
| `--target NAME` | Warning budget: `desktop`, `mobile` or `crowd` | `desktop` |
| `--layout NAME` | `separate` or `material` | `separate` |
| `--allow-warnings` | Acknowledge technical warnings; use only after reviewing them | off |
| `--flat` | Flat material colors instead of baked pigment | off |

The command writes `<name>.glb`, `<name>.asset.zip` (the full package), `manifest.json` and `audit.json`, then prints a JSON summary. It refuses an existing output directory. Unknown flags, failed checks and unacknowledged warnings give a nonzero exit code. Ctrl+C cancels the build. `--help` prints the usage.

Model IDs are listed in [content-catalog.md](content-catalog.md).

`node scripts/check-catalog-delivery.mjs` builds, audits and reads back a static, material-grouped GLB for every library model and writes `test-results/catalog-exports.json`. It acknowledges warnings for this sweep and records them; it approves nothing.

### From code

`src/export/delivery.js`, `glb.js`, `archive.js` and `packing.js` have no DOM or engine dependency. `buildDelivery(blueprint, settings, {signal, onProgress})` returns `{name, glb, zip, manifest, report}`. Settings use `mode` (`static`/`motion`), `pose`, `phase`, `frames`, `start`, `end`, `target`, `pigment`, `acknowledgeWarnings` and `meshLayout` (`separate` by default, or `material`). `deliveryEligibility(blueprint)` reports unsupported genes without building. The GLB reader in `glb.js` is strict and meant for emitted files and tests, not arbitrary user files.

## Known limits

Exports have vertex-color materials only, no texture atlas, no reusable bone skeleton, no automatic seamless loop, no root motion, no terrain contact and no collision data. Target-engine import (Blender, Unity, Unreal, Khronos validation) is not checked by these tools. No technical check approves self-intersections, equipment fit, anatomy or production quality.

Reference: Khronos glTF 2.0 specification, sections 3.7 (geometry and morph targets), 3.9 (materials), 3.11 (animations) and 4 (GLB layout): https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
