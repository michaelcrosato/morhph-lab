# Changelog

What each Morph Lab release added or changed. The guides in [docs/](docs/) describe the current state; history lives here. Counts are library totals after the release.

## Unreleased

Repository cleanup. No content changes: 89 models, 73 part families, blueprint schema 6.

- Fixed: a spore overlapping the spawn point could never be collected. The physics event queue auto-drained the collision event from the initial step before it was read.
- The release is one file, `dist/Morph-Lab.html`, which opens in Create. The identical `index.html` and `Morph-Lab-Creator.html` copies and the Review/Workshop start variants are gone; use the header buttons or `?review` / `?workshop`. The file is 1.14 MB (1.23 MB before) even though the shipped source is now readable, because the app document is no longer base64-encoded twice.
- Exported packages' `README.txt` names the current version instead of "MORPH LAB 11".
- Source reformatted with Prettier and ruff (it was nearly minified). Removed two unreachable modules, the unchecked `.d.ts` files, unused imports and locals, and duplicated math helpers; geometry output is bit-identical (v6/v7 hash fixtures).
- Tooling: 62 npm scripts reduced to 22. Per-collection review, swatch and geometry-regression scripts are merged into `catalog-review.mjs`, `surface-swatches.mjs` and `geometry-regression.mjs`; release-evidence scripts are removed; `export-asset.mjs --help` lists every option.
- `examples/` regenerated from the current generators (203 files were stale, 6 were missing); `npm run test:examples` now fails when they drift.
- Tests: engine tests moved to `tests/engine/`. Browser suites share `tests/browser_support.py`, use Playwright's bundled Chromium unless `CHROMIUM_PATH` is set, run with `python3`, and write to `test-results/browser/`. `test-results/` is no longer committed.
- Docs consolidated into `docs/` and this changelog. Node.js 22 or later is required.

## 12.0.0 — Discovery Studio

- New **Create** workspace, now the start screen of the single-file release: seeded rolls from six source pools, **Vary current**, six-candidate batches, isolated trait rolls, and six trait locks (Body, Head parts, Other parts, Surface, Colors, Motion).
- Local discovery collection: 48 entries, favorites, search, confirmed removal, validated backup and merge (8 MB limit), and an explicit notice when storage fails and the collection is memory-only.
- Fixed A/B parents with a master blend and six separate channels in a reversible preview; up to 40 undo/redo steps.
- Portable discovery recipes (`.discovery.json`). Create connects to the existing blueprint and GLB export tools.
- CPU geometry preview with real thumbnails, and an optional Three.js WebGL2 view that does not load Rapier.
- Fixed negative Workshop frame times: `src/core/frame-clock.js` uses animation-frame timestamps only, resets on mode and visibility changes, and caps a step at 0.1 s.
- The current model, review record and discovery state carry across in-file workspace switches.
- No content changes: 89 models, 73 part families, blueprint schema 6, Three.js 0.181.0, Rapier compat 0.19.3.

## 11.0.0 — Complete Coverage

- Moved the remaining 16 original families (`leg`, `eye`, `horn`, `tail`, `fin`, `mouth`, `wing`, `tentacle`, `antenna`, `shell`, `mandible`, `crest`, `clubtail`, `frill`, `claw`, `gill`) to shared engine-free geometry. All 73 families are shared, and all 89 presets pass the export coverage gate (up from 65).
- The 16 converted families have new triangulation. Horns use the bone material; fin and wing ribs follow their membranes. The 65 previously complete presets were unchanged.
- Asset export **Mesh layout**: Group by material (browser default) or Separate meshes (API and CLI default). Grouping is lossless and records a source-range map.
- Inactive genes (presence at or below 0.005, walker legs on humanoids) are named with reasons in the Inspector, audit and manifest.
- Saved reviews record a geometry implementation marker; older sessions keep their data but reset manual decisions.
- Inspector filter **Completed: original models** lists the 24 presets that previously lacked complete offline geometry.
- No content changes; schema 6.

## 10.0.0 — Delivery & Reliability

- GLB asset export from the Inspector and the command line: a static pose or baked motion (9, 17 or 33 samples as morph targets) in a deterministic ZIP with `model.glb`, `source.morph.json`, `manifest.json`, `audit.json`, `README.txt` and SHA-256 hashes.
- Export gates: complete-source coverage, data and topology checks, hard size limits, Desktop/Mobile/Crowd warning budgets, and binary readback of every emitted pose. 65 of 89 presets were eligible.
- **System checks** panel: **Check this browser** and **Check engines + physics**, with pass/fail/blocked results and a local JSON report.
- No content changes; schema 6.

## 9.0.0 — Field & Settlement

- 10 models: four animal creatures (Trail hound, Hill grazer, Bristle tusk, Reed hopper) and six civilian or guard humanoids (Field medic, Lamplighter, Archivist, Prospector, Waypost archer, Caravan courier). Total 89: 27 humanoids and 62 creatures; 55 Ground, 18 Water, 16 Air.
- 8 part families (`beastleg`, `brushtail`, `worktool`, `fieldlamp`, `folio`, `bowrig`, `utilitybelt`, `mantle`), total 73. The 12 families added in 4.0.0 moved to shared geometry: 57 shared.
- 5 kits (31), 3 creature movement recipes (37), 6 humanoid actions (35), 4 pigment patterns (46), 3 microtextures (31), 4 surface recipes (46), 4 palettes (36), 2 inspection templates (24).
- Held props give hand-curl hints; the Inspector samples finger hinges in humanoid motion-cycle mode.
- **Export library coverage** report in the Inspector.
- Schema 6 unchanged.

## 8.0.0 — Carapace & Bloom

- 14 models: four Ground, four Water and two Air creatures, and four humanoids. Total 79: 21 humanoids and 58 creatures.
- 10 part families (`legbank`, `plateband`, `petalcrown`, `valvepair`, `tubecluster`, `irismouth`, `latticecage`, `whiskerfan`, `trunk`, `faceplate`), total 65; 37 with shared geometry.
- 6 kits (26). **Part arrays** add ring, fan or row copies of a part in one undo step.
- 6 creature movement recipes (34) and 6 humanoid actions (29).
- 8 pigment patterns (42), 6 microtextures (28), 8 surface recipes (42), 6 palettes (32).
- The Inspector draws shared parts on humanoid joints and adds humanoid action and mask controls.
- Schema 6 unchanged.

## 7.0.0 — Strange Forms

- 12 creatures: six Water and six Air. Total 65: 17 humanoids and 48 creatures.
- 12 part families, total 55; 27 with shared geometry. Shared part plans gained a packed version-2 layout with per-range motion.
- 6 kits (20) and 8 movement recipes (28), with new motion channels `comb`, `pump`, `spread`, `spin`, `fold` and `scull`.
- 8 pigment patterns (34), 6 microtextures (22), 8 surface recipes (34), 6 palettes (26).
- Content pack filter in the Workshop and Inspector.
- Schema 6 unchanged.

## 6.0.0 — Tide & Sky

- 16 creatures: eight Water and eight Air. Total 53: 17 humanoids and 36 creatures.
- 15 part families with shared engine-free geometry used by both the CPU Inspector and Three.js, total 43.
- Travel media: Ground, plus a three-axis arcade controller for Water and Air with a reef tank and sky course.
- Body deformation: Rigid, Lateral wave, Vertical wave, Pulse.
- 6 kits (14), 8 movement recipes (20), 8 pigment patterns (26), 6 microtextures (16), 12 surface recipes (26), 8 palettes (20), 6 inspection templates (12).
- Blueprint schema 6. Imports schemas 1–5; missing travel becomes Ground and missing body wave becomes Rigid.

## 5.0.1 — Workshop navigation fix

- The release HTML contains both workspaces. A launcher swaps them in place instead of navigating to a sibling file, and carries the current blueprint and review record across.
- Startup errors offer a return to Inspect.
- No model, material, animation, physics or schema changes.

## 5.0.0 — Foundation Studio

- Offline foundation Inspector: CPU depth-buffered rendering of the generated triangles; no engine needed.
- Display modes, orthographic cameras, A/B comparison with a silhouette difference, ten diagnostic poses, a proportion sweep, technical audits and a six-item manual checklist.
- Six inspection templates and five shape profiles; image and OBJ references; PNG, OBJ, review-session and audit exports; a headless review batch.
- **Defined** humanoid body construction with a derived neck support; **classic** kept for older files.
- Workshop runtime review capture.
- Blueprint schema 5. Imports schemas 1–4.

## 4.0.0 — Modular content

- 16 models: eight humanoids and eight creatures. Total 37: 17 humanoids and 20 creatures.
- 12 attachment families (`ear`, `antler`, `beak`, `muzzle`, `crystal`, `foliage`, `blade`, `shield`, `staff`, `pack`, `pauldron`, `banner`), total 28.
- 8 part kits, and a per-part material choice.
- 4 locomotion recipes (12), 3 gait styles (7), 12 humanoid actions (23) with new timing markers.
- 8 pigment patterns (18), 6 microtextures (10), 8 surface recipes (14), 6 palettes (12).
- Mixer part matching includes the socket.
- Blueprint schema 4. Imports schemas 1–3.

## 3.0.0 — Humanoids and actors

- Humanoid rig family: 22-bone skeleton, 11 proportion controls, outfits, head covers, hand styles and joint sockets.
- 9 humanoid models. Total 21.
- Humanoid locomotion (idle, walk, run, creep), 4 gait styles, and one masked action layer with 11 actions and `animation-marker` events.
- Nine actor role profiles, actor manifests (`.actor.json`) and seeded rosters (`.roster.json`).
- The mixer handles humanoid/creature pairs.
- Blueprint schema 3.

## 2.0.0 — Mixer

- Five-channel A/B recipe mixer (Body, Parts, Pigment, Surface, Motion) with locks, frozen data, a body-graph rule, seeded variation, preview/Apply/Cancel, and `.morphmix.json` recipes.
- Up to four pigment layers, generated microtextures, and six material recipes.
- Eight motion states and six secondary motion gains.
- Blueprint schema 2. Imports schema 1.

## 1.0.0

No release notes survive for this version; this entry is reconstructed from later guides.

- Procedural creature workshop: an implicit body graph meshed by marching tetrahedra, attachment genes projected onto the surface, procedural motion with two-bone leg IK, generated skin patterns, and a Rapier physics habitat.
- 12 creature models and 16 attachment families.
- Blueprint schema 1.
