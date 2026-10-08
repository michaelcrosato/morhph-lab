> Historical release note. For v11, read `COMPLETE-COVERAGE-GUIDE.md` and `verification.json`.

# Morph Lab v10 — Delivery & Reliability

## Decision

Version 9 had 89 model recipes, 73 part families, and a large motion and surface library. The next useful step was to get checked assets out of the generator and obtain runtime evidence from the computer that runs the game. Another asset pack would not address those gaps.

This release adds GLB delivery, complete-source export gates, binary readback checks, and a local system-check panel. No models, parts, motion recipes, or textures were added or removed. The blueprint schema remains 6. The engine versions remain Three.js 0.181.0 and Rapier compat 0.19.3. The Workshop still requires WebGL2.

## Open the release

Open the saved `Morph-Lab-v10.html`. Inspect and Workshop are in the same file. No second HTML file is needed for navigation.

Inspect and asset export work offline. The Workshop and the full engine check need access to the pinned engine packages. In the supplied CDN edition, that requires internet access. The HTML is not an engine-embedded offline game.

## Export an asset

Open **Inspect**, choose a source, then select **Export asset**. Start with Moon bell, Trail hound, Archivist, Glass dart, or Wayfarer.

Use **Static posed model** to export one diagnostic pose and phase. Use **Model + baked motion** to sample the source's current procedural motion from phase 0 to 1. Humanoid action settings come from the source blueprint. Clothing and details are always included, even when hidden in the Inspector view.

Nine samples are the default. They use eight morph targets per mesh. Seventeen and 33 samples use 16 and 32 targets. More samples improve temporal sampling but increase file size, memory, and importer requirements. Check the target game's morph-target limits. The file is not a skeleton animation or a retargetable clip.

Select **Build asset package**. The job reports its current step and yields between mesh writes, motion samples, and binary checks. **Cancel build** stops at the next yield. Closing the dialog also cancels the job. One compiler sample is synchronous, so cancellation is not immediate during that sample.

After the job completes, select **Download asset ZIP** or **Download GLB**. The source is copied at dialog open. The job does not change the blueprint, baseline, notes, or manual decisions. A settings change clears the old result.

### Files in the package

| File | Content |
|---|---|
| `model.glb` | Indexed geometry, normals, linear vertex colors, standard metallic/roughness materials, and optional sampled motion |
| `source.morph.json` | Complete editable blueprint |
| `manifest.json` | Source/settings hashes, coordinates, bounds, mesh and triangle counts, motion data, actor metadata, and delivery limits |
| `audit.json` | Geometry checks for every sample, warnings, coverage, and exported-pose readback error |
| `README.txt` | Import and scope notes |

The manifest lists the length and SHA-256 of the other four files. It does not list its own hash. ZIP entries use STORE, not compression. The archive has fixed timestamps so identical source and settings produce identical bytes. CRC checks and SHA-256 checks detect corruption; they are not a signature or proof of authorship.

The exported geometry has no external file references. It does not need Three.js, Rapier, internet access, or the Morph Lab runtime to load in a compatible GLB application.

### Material scope

The exporter converts CPU pigment samples to linear vertex colors. It writes standard roughness, metalness, emissive values, and double-sided materials. The importer must use vertex colors.

Fine procedural pattern detail is limited by vertex density. Bump/normal textures, UV texture atlases, custom shaders, GPU shading, physical hair, translucency, and cloth simulation are not exported. The result is not an exact material capture of the Workshop.

### Animation scope

Each motion sample becomes a POSITION and NORMAL morph target relative to the first frame. A glTF weight animation interpolates between the samples. Geometry stays in the original compiler coordinate system: metres, +Y up, +Z forward. There is no automatic centering.

Humanoid diagnostic animation and creature procedural motion can be baked. The bake has no reusable bone skeleton, joint sockets, retargeting, root-motion track, terrain contact, collision shape, AI, or combat system. The actor profile in the manifest is metadata only. Regenerate from the source blueprint after edits.

The exporter does not force the last frame to equal the first. It records the largest endpoint position gap and recommends one-shot playback. A matching endpoint does not prove a smooth velocity transition. glTF does not contain a universal player loop switch; `recommendedPlayback` is an application note in extras and the manifest. Configure the target player yourself.

## Export gates

**65 of the 89 built-in models have complete Inspector geometry and pass the coverage gate.** This is eligibility, not approval. Budget or pose warnings can still stop a job.

The other 24 models use at least one of the 16 legacy families not drawn by the offline Inspector. Their geometry exports are blocked. The UI names the missing families. The source-blueprint button remains available. No attachment is silently dropped.

The missing families are `leg`, `eye`, `horn`, `tail`, `fin`, `mouth`, `wing`, `tentacle`, `antenna`, `shell`, `mandible`, `crest`, `clubtail`, `frill`, `claw`, and `gill`. Their Workshop factories still exist. This release does not migrate or replace them.

All exports check finite data, normal lengths, triangle indices, stable mesh names, stable topology across samples, and hard size limits. The limits are 200,000 vertices, 300,000 triangles, 256 meshes, 33 motion samples, and 64 MiB per GLB. The existing blueprint limit remains 32 attachment genes.

Desktop, Mobile, and Crowd settings select warning budgets. They do not simplify meshes. Warnings need explicit acknowledgement. Failed checks cannot be acknowledged away. The audit retains all warnings.

Before a file is offered, the exporter reads its own binary and compares every emitted frame against a fresh source sample. A position error greater than 0.00001 metre blocks export. This internal test does not replace an independent importer or a formal glTF validator.

## System checks

Select **System checks** from Inspect or Workshop. The Workshop startup-error screen also has this button.

**Check this browser** compiles a minimal WebAssembly module, requests a real WebGL2 context, and compiles/draws the actual procedural pattern GLSL when a context exists. It does not load engine packages.

**Check engines + physics** also loads the exact engine versions. With those engines available, it attempts five complete model renders: Wayfarer, Trail hound, Moon bell, Glass dart, and Mossback. It checks shader errors and pixel readback. It also runs the actual Rapier Ground, Water, and Air controller paths, with settle, movement, vertical travel, and reset checks.

Results are **pass**, **fail**, or **blocked**. A local capability pass is not full runtime approval. A missing engine, unavailable context, or dependent test that cannot run is reported as blocked, not passed. The engine-load timeout is 15 seconds per load or initialization stage.

Export the JSON report after a run. It stays local. It does not contain the model, save data, local file path, or account data. The full check can request the pinned public engine files; no report is uploaded. Closing or cancelling stops the check at a test boundary. A dynamic import already started can finish in the browser after cancellation.

These are smoke tests, not frame-rate benchmarks or full gameplay acceptance. Material appearance, interaction, locomotion, all models, and target hardware still require review.

## Command-line delivery

Node.js 20 or later is required. Asset export and core tests need no engine installation.

```sh
cd morph-lab-v10
node scripts/export-asset.mjs --preset moonbell --motion --frames 9 --out output/moon-bell
node scripts/export-asset.mjs --input my-creature.morph.json --pose bind --out output/my-creature
```

The output directory must be new. The command refuses to overwrite an existing directory. Optional flags include `--target desktop`, `--allow-warnings`, `--flat`, and `--phase 0.5`. Use `--allow-warnings` only after review. A failed job has a nonzero exit code.

For the source UI and actual engines:

```sh
npm install
npm run doctor
npm run dev
```

Open `http://localhost:3000/review.html` to start Inspect. With the exact engines installed, both development entry pages use local engine files. The installation report checks package presence and version only. It does not claim a render or physics pass.

```sh
npm run build -- --cdn
npm run build -- --offline
```

The second command requires installed engine files. It fails when they are missing. It does not silently produce a CDN build when offline mode is requested.

## Tests and examples

```sh
npm test
npm run test:examples
npm run examples:delivery
npm run test:delivery-import
node scripts/delivery-gallery.mjs
python scripts/delivery-sheet.py
npm run build -- --cdn
npm run test:delivery-ui
```

The independent import test needs Python, NumPy, and trimesh. Image sheets need Pillow. Browser tests need Python Playwright and Chromium. Set `CHROMIUM_PATH` when needed. Python test packages are not bundled. No font files are included.

The six sample packages contain a static Wayfarer and baked Archivist, Trail hound, Moon bell, Glass dart, and Linked salp assets. The source script regenerates them and the original pose fixtures used for independent checks. The samples are technical examples, not approved production assets.

## Measured scope

Read `verification.json` for final counts and file hashes. This release tests the real CPU geometry and actual exported binary. Trimesh loads the static scene structure. A separate Python/NumPy decoder reads the morph animation and compares all vertices against original source snapshots.

The reference sheet compares actual source geometry and GLB readback in the same camera and clay material. No model pixels are replaced with illustrations. There are eight paired views. The comparisons test geometry transfer, not GPU materials or artistic quality.

The Khronos validator, Blender, Unity, Unreal, and GPU import were not run in the authoring environment. The real Three.js renderer and Rapier gameplay remain unverified there. Engine installation failed with `EAI_AGAIN`. The test browser returned no WebGL2 context. Direct file navigation was blocked by browser policy. Tests loaded the exact packaged HTML bytes and used the real buttons instead. Direct Windows file launching remains unverified.

The prior Abyss angler and Revenant deformation warnings are not fixed. The original content/geometry modules are unchanged except for the library-report application-version field.

## Reuse and next priorities

`src/export/glb.js`, `archive.js`, and `delivery.js` have no DOM or engine dependency. Browser controls live in `src/export/panel.js`. Diagnostics are separate from the generator and use real APIs only. The strict GLB reader is for emitted files and tests, not an arbitrary user-file importer.

Keep using blueprints as the editable source of truth. Use GLB for transfer and sampled previews. For large crowds or retargetable humanoids, the next work should be complete legacy-part coverage, skeletal export, material/texture baking, and lower-detail geometry. Those features are not part of this release.

Authored source is MIT-licensed. Engine licenses remain separate. No imported models, texture files, animation clips, or font files were added.

## Primary technical references

Implementation reference: Khronos glTF 2.0 specification, sections 3.7 (geometry and morph targets), 3.9 (materials), 3.11 (animations), and 4 (GLB layout).

https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

Runtime API references:

https://threejs.org/docs/pages/WebGLRenderer.html

https://rapier.rs/docs/user_guides/javascript/getting_started_js/
