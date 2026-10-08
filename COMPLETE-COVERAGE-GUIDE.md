# Morph Lab v11 — Complete Coverage

## Decision for this pass

The library already has 89 models and 73 part families. Version 10 could export only 65 presets. The offline Inspector had no geometry implementation for 16 older families. Some exported humanoids also had many separate meshes.

This release closes the coverage gap, adds lossless material grouping to asset export, and prevents old review decisions from surviving a geometry-version change. No model, part family, animation recipe, or texture preset was added or removed. The application version is 11.0.0. The blueprint schema remains 6.

The Workshop pins remain Three.js 0.181.0, Rapier compat 0.19.3, and WebGL2. Inspect and asset export work offline. The supplied combined HTML still needs internet access when the Workshop loads its engines. It is not an engine-embedded offline game.

## 1. All part families use shared geometry

The following 16 families now use the same engine-free geometry plans in the Inspector and the Three.js adapter:

`leg`, `eye`, `horn`, `tail`, `fin`, `mouth`, `wing`, `tentacle`, `antenna`, `shell`, `mandible`, `crest`, `clubtail`, `frill`, `claw`, and `gill`.

Each keeps its three shape choices and existing gene ID. Plans are compiled once. Animation samples write into separate frame buffers. Time changes start from rest data and do not accumulate deformation. Mirrored flexible parts use reflected points and corrected triangle winding. Protected eye materials remain independent of the part's main material.

The original walker leg now has one shared mesh plan and one shared diagnostic foot-target function. The runtime still supplies its existing terrain-aware joint targets. The offline Inspector uses diagnostic targets on a flat floor. The shared geometry does not add physical feet or limb colliders.

All 73 families can now be inspected. All 89 presets pass the coverage gate. Geometry warnings, hard file limits, and failed technical checks still apply.

### What changed in older shapes

The 16 converted families have new triangulation. They are not byte-identical versions of the earlier Three.js-only meshes. Their variants and dimensions remain driven by the same genes. Horns now use the bone material instead of the old vertex-gradient horn material. Fin and wing ribs follow the same deformation as their membranes.

The 65 presets that already had complete Inspector geometry were compared with the unmodified v10 source. Their geometry matched at two sampled phases each. All 89 preset blueprint JSON values matched the v10 definitions. These checks do not establish GPU appearance parity.

The before/after sheet compares the old **offline Inspector** with the new Inspector. It does not show that the old Workshop lacked these parts. No model pixels were replaced with illustrations.

## 2. Find the completed original models

Open the combined HTML. Open **All 89 blueprint sources** and select **Completed: original models** in the content filter. This shows the 24 presets that previously lacked complete offline geometry.

Start with Mossback, Glider, Tendril, or Fiend. Select **motion-cycle** and change **Pose phase**. Use **Fit both once** after a large shape or camera change. Clay and silhouette views show geometry without pigment detail.

Technical checks do not automatically accept any manual review decision. Joint seams, intersections, equipment fit, anatomy, and surface quality still need visual review.

## 3. Export fewer meshes without deleting geometry

Open **Export asset**. The new **Mesh layout** field has two options:

| Option | Use |
|---|---|
| Group by material | Combine meshes that use the same material class. This is the browser default. |
| Separate meshes | Keep each source component as a separate mesh node. |

Grouping preserves every vertex, triangle, normal, vertex color, and sampled animation frame. It does not weld vertices, simplify triangles, bake textures, or change the source blueprint. It does not change the Workshop into a grouped runtime.

The GLB node extras and package manifest contain a source-range map. Each range records the original component name and its vertex and index range. This lets another tool trace grouped triangles to their source. A target game does not automatically split those ranges back into objects.

Keep **Separate meshes** when the target application must address, remove, or animate individual components. Grouping changes node names and component granularity. It does not add equipment sockets, a reusable skeleton, or retargeting.

### Measured examples

The following figures use nine-frame baked motion exports:

| Model | Separate meshes | Grouped meshes | Triangles, unchanged |
|---|---:|---:|---:|
| Mossback | 26 | 8 | 30,424 |
| Glider | 30 | 8 | 29,750 |
| Reef drifter | 26 | 8 | 22,296 |
| Tendril | 24 | 8 | 20,312 |
| Fiend | 73 | 9 | 53,532 |
| Archivist | 62 | 11 | 42,632 |

These are mesh counts, not measured draw calls or frame rates. File-size reductions are modest because the geometry is unchanged. Morph-target memory and triangle counts remain important. This is not a crowd LOD system.

The programmatic API and CLI retain **separate** as the default for compatibility. Select `meshLayout: 'material'` in the API, or use `--layout material` in the CLI.

## 4. Complete and inactive are different states

A gene with presence at or below the display threshold of 0.005 remains in the blueprint but emits no part. An original walker-leg gene on a humanoid also remains inactive because the humanoid rig supplies its own two legs.

The Inspector, audit, and delivery manifest now name inactive genes and their reasons. Such genes are not reported as missing implementations. The manifest records both `allActiveGenesIncluded` and `allGenesIncluded`. The latter is false when inactive genes remain in the source.

Export still includes the complete source blueprint. It does not delete inactive or incompatible genes to pass a check. Invalid source data is rejected by the existing schema validator.

### Saved reviews check the geometry implementation

Saved review sessions now record `implementation: "morph-lab-shared-geometry-11"`. The parser clears manual decisions when that marker is absent or different. It retains the source, candidate, pinned baseline, camera, settings, and notes. The Inspector shows why the decisions were reset.

This rule is conservative: older reviews reset even when their model happens to be unchanged. A current-version review round-trips its valid decisions. A later blueprint edit still clears them. No test assigns production approval.

This is a version-validity check, not a digital signature or a defense against deliberate file tampering. Developers must change the implementation marker when geometry or diagnostic pose behavior changes.

## 5. Export gates remain in place

The exporter checks source geometry before grouping. Source limits cannot be bypassed by selecting a compact layout. The hard limits remain 200,000 vertices, 300,000 triangles, 256 source meshes, 33 motion samples, and 64 MiB per GLB.

Desktop, Mobile, and Crowd settings are warning budgets. They do not simplify the model. The mesh warning uses the actual exported mesh count. Triangle, topology, normal, and deformation checks still use the complete source geometry. Warnings require acknowledgement. Failed checks cannot be acknowledged away.

Every emitted pose is read back from the GLB and compared with a fresh source sample. The package still contains `model.glb`, `source.morph.json`, `manifest.json`, `audit.json`, and `README.txt`. Each file has its recorded size and hash. Identical source and settings produce identical bytes.

Exports retain the v10 limits: vertex-color materials, no detailed texture atlas, no reusable bone skeleton, no automatic seamless loop, no root motion, no terrain contact, and no physical collision data.

## 6. Evidence from this pass

Final counts and hashes are in `verification.json`.

The full catalog check samples eight phases for all 89 models: 712 poses. It reported 704 technical passes, eight warnings, and no failures. No active genes were omitted. The 24 newly completed models also produced 192 rendered images with no frame clipping.

All 89 presets were built as static, material-grouped GLBs and read back. One had a retained warning: Abyss angler. This test explicitly allowed warnings and recorded them. It did not approve the model.

Six nine-frame packages were checked with independent Python/NumPy animation decoding and trimesh static imports. The checks compare original positions, normals, vertex colors, indices, source ranges, file hashes, and all 54 sampled poses. Twelve source/readback image pairs had no changed color channels under the same CPU camera and clay display.

The known Abyss angler arm-crown warnings remain in all eight sampled phases. Revenant still has warnings in the two sampled crouch poses. They are in `test-results/v11/retained-warnings.json`.

### What was not verified

The authoring environment did not have the engine packages and did not provide a WebGL2 context. The new real-engine adapter test could not load Three.js. There is no substitute engine or fake physics pass.

Three.js GPU rendering, shader appearance, Rapier gameplay, runtime adapter execution, target-game GPU import, formal Khronos validation, Blender/Unity/Unreal import, and the engine-embedded offline build remain unverified here. Direct Windows file launching also remains unverified. Browser tests use the exact combined HTML bytes and real controls through the browser's content-loading API.

Use **System checks → Check engines + physics** on the computer that runs the Workshop. A blocked check is not a pass. Keep the report with the asset review record.

## 7. Run and reproduce

Use Node.js 20 or later. Engine installation is not needed for core tests, CPU inspection, or asset export.

```sh
cd morph-lab-v11
npm test
npm run test:examples
npm run audit:library
npm run audit:exports
```

Export one asset to a new directory:

```sh
node scripts/export-asset.mjs --preset mossback --motion --frames 9 --layout material --out output/mossback
```

The CLI refuses to overwrite an existing directory. Use `--allow-warnings` only after reviewing the named warnings. Unknown settings and failed geometry checks cause a nonzero exit code.

Render the full catalog, generate the six grouped samples, and check independent imports:

```sh
npm run review:coverage
npm run review:packing
npm run test:packing-import
```

The independent import script needs Python, NumPy, and trimesh. Image sheets need Pillow. Browser checks need Python Playwright and Chromium. Set `CHROMIUM_PATH` when needed.

```sh
npm run build -- --cdn
npm run test:all-ui
```

To compare with the original v10 source, extract that archive separately and supply its project directory:

```sh
node scripts/compare-v10.mjs /path/to/morph-lab-v10
python scripts/coverage-sheets.py
```

Install the pinned engines to run the actual Workshop and adapter tests:

```sh
npm install
npm run doctor
npm run test:coverage-engine
npm run test:engine
npm run dev
```

Open `http://localhost:3000/review.html`. An engine-embedded build requires the installed engine files:

```sh
npm run build -- --offline
```

## 8. Extension points and remaining priorities

New shared-family definitions should use `src/core/shared-parts.js` and the engine-free geometry functions. `classic-catalog.js` separates original metadata from factory code to prevent import cycles. `classic-geometry.js` defines the migrated shapes and motion. `walker-geometry.js` accepts solved joints but knows nothing about the renderer or physics world.

`src/creature/tidal-parts.js` is the common Three.js adapter. `src/export/packing.js` changes delivery layout without changing source geometry. The range map is part of the delivery record, not part of the editable gene schema.

The next larger gaps remain full-engine evidence, reusable skeletal exports, texture baking, lower-detail geometry, and equipment/terrain constraints. Complete coverage does not solve those items.

Authored source remains MIT-licensed. Existing engine licenses remain separate. No external models, texture images, animation clips, or font files are included.
