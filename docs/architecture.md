# Architecture

Morph Lab is a browser application with three workspaces (Create, Inspect, Advanced workshop) over one data model: the validated **blueprint**. Engine-free core modules generate geometry, motion and surfaces from blueprints. Two renderers consume the same geometry: a CPU depth-buffer rasterizer (Create preview, Inspector, asset export) and Three.js/WebGL2 (Workshop, optional Create view). Rapier runs the Workshop habitat only.

## Data flow

```text
A blueprint + B blueprint + settings + frozen values
                         |
                  core/mixer.js
                         |
             validated schema-6 blueprint  <--- core/genome.js (validate, upgrade 1-5)
              /            |            \
   core/anatomy.js    core/store.js    creator/generator.js
     /        \       (editor history)  (rolls, discovery recipes)
 body mesher   part plans
 core/mesher.js  core/tidal-geometry.js (all 73 families)
      |              |                         |
      +------+-------+-------------------------+
             |                                 |
  creature/assemble.js (Three.js)     review/foundation.js (CPU)
     materials, animator + IK            raster.js, audit.js
             |                                 |
     render/stage.js (WebGL2)          export/delivery.js -> GLB + ZIP
             |
  physics/world.js (Rapier) <- anatomy analysis + level
```

The blueprint is the source of truth. The UI never stores a Three.js object, Rapier handle, shader or function in it. Imports reconstruct allowed fields only, reject invalid types, and check graph and resource limits. No code runs from imported JSON.

## Module map

| Path | Contents |
|---|---|
| `src/boot.js` | Entry point. Picks the workspace (embedded launcher state, or `?creator` / `?review` / `?workshop`, or the page's default) and lazily imports `creator/app.js`, `review/app.js` or `main.js`. Shows the startup-error panel. |
| `src/main.js` | Workshop entry: engine version checks, render stage, physics world, habitat loop, frame clock, keyboard input, and the read-only `window.morphLab` diagnostics object. |
| `src/core/` | Engine-free, DOM-free data and geometry (details below). |
| `src/creator/` | Create workspace: `app.js` (UI), `generator.js` (seeded rolls, traits, locks, batches, mixes, discovery recipes), `session.js` (current model, parents, preview transaction, undo/redo), `library.js` (collection storage, backup and merge), `preview.js` (CPU preview and thumbnails), `camera.js` (fit), `webgl-preview.js` (optional Three.js view without Rapier). |
| `src/creature/` | Three.js runtime: `assemble.js` (the `Creature` compiler boundary), `parts.js` (`PartRegistry`, `defaultRegistry()`), `tidal-parts.js` (the adapter for every shared part plan), `surface.js` (body mesh adapter), `materials.js`, `shaders.js` (GLSL), `animator.js` (creature gait and IK), `humanoid-runtime.js` (Skeleton and SkinnedMesh), `humanoid-animator.js`. |
| `src/diagnostics/` | System checks: `runner.js` (WebAssembly, WebGL2, GLSL, engine render and controller checks) and `panel.js` (UI and report). |
| `src/editor/` | Workshop editor state and DOM routing (`editor.js`) and the reversible mixer preview session (`mixer-controller.js`). |
| `src/export/` | Asset delivery: `delivery.js` (capture, gates, audits, sampled motion, readback), `glb.js` (GLB writer and strict reader), `archive.js` (deterministic ZIP, CRC32, SHA-256), `packing.js` (lossless material grouping), `panel.js` (browser controls). |
| `src/game/` | `habitat.js`: habitat scenery for Ground, Water and Air. |
| `src/physics/` | `world.js`: Rapier world, compound anatomy collider, sensor pickups, controllers. |
| `src/render/` | `stage.js` (explicit WebGL2 renderer and orbit rig), `picking.js` (rest-space attachment point from a hit on animated skin), `review-capture.js` (full-runtime review sheet). |
| `src/review/` | Inspect workspace: `app.js` (UI), `foundation.js` (`FoundationCompiler`, templates, shape profiles, poses), `raster.js` (CPU depth-buffer renderer), `audit.js`, `pigment.js` (CPU pattern sampling), `math.js`, `obj.js`, `session.js` (review records), `transfer.js` (workspace switching and handoff). |
| `src/ui/` | Workshop view and panels: `view.js`, `mixer-panel.js`, `actor-panel.js`, `part-array-panel.js`, `icons.js`, `tool-dialog.js` (shared modal and downloads). |

### `src/core/`

| Area | Modules |
|---|---|
| Blueprint | `genome.js` (schema 6, validation, upgrade, limits, `preset()`), `presets.js` (model registry), `version.js` |
| Part metadata | `catalog.js` (the full `CATALOG`), `shared-parts.js` (`SHARED_PARTS`), and one catalog per content pack: `classic-`, `expansion-`, `tidal-`, `frontier-`, `bloom-`, `field-catalog.js` |
| Model recipes | `presets.js`, `humanoid-presets.js`, `content-pack.js` and `expansion-presets.js`, `tidal-`, `frontier-`, `bloom-`, `field-presets.js` |
| Body | `anatomy.js` (node resolution and attachment projection), `mesher.js` (marching tetrahedra) |
| Part geometry | `tidal-geometry.js` (`compileTidalPart` / `sampleTidalPart` for every family), `classic-geometry.js`, `walker-geometry.js`, `legacy-shared-geometry.js`, `frontier-`, `bloom-`, `field-geometry.js`, `parametric-mesh.js`, `solid-mesh.js` |
| Humanoid rig | `humanoid.js` (rig contract, proportions, sockets), `rig-data.js` (skeleton, skin weights, garment), `foundation-shapes.js` (shared detail plan), `ik.js` |
| Motion | `motion.js` (recipes and secondary layers), `humanoid-motion.js` (action layer and markers), `expansion-`, `frontier-`, `bloom-`, `field-motion.js`, `equipment-pose.js` (grip and bow hints) |
| Travel | `travel.js` (body wave and Water/Air controller), `level.js`, `travel-level.js` |
| Surfaces | `surfaces.js` (patterns, microtextures, recipes), `tidal-`, `frontier-`, `bloom-`, `field-surfaces.js` |
| Editing | `mixer.js`, `kits.js`, `part-arrays.js`, `store.js` (transactional editor store), `actors.js` (roles, manifests, rosters) |
| Other | `library-coverage.js`, `frame-clock.js`, `workspace-route.js`, `math.js` |

## Coordinates and identity

Units are metres, seconds and radians. The frame is right-handed with +Y up and +Z toward the face; X is the bilateral axis. Body nodes have parent-relative offsets and ellipsoid radii; node-local rotation is not supported.

Gene IDs are persistent. A mirrored gene creates two runtime instances sharing one gene ID. Runtime UUIDs and physics handles never enter saved data. Local symmetry mirrors around the host node, not the whole body graph.

An attachment stores a direction from its host centre. Anatomy projects it onto the implicit skin and computes an outward normal, so attachments survive remeshing. The ellipsoid field is a conservative smooth-minimum approximation, not an exact signed distance; body meshing and attachment projection use the same field. Humanoids use the same mechanism for their four structural nodes and add bone sockets.

## Body mesh

`core/mesher.js` produces typed-array positions, normals, UVs and indices with marching tetrahedra, sharing edge intersections and taking normals from the field gradient. The Three.js adapter wraps these arrays in a BufferGeometry.

A `Creature` owns its meshes, materials, textures and part objects; `dispose()` releases them and is safe to call twice. A rebuild with unchanged body nodes clones the previous body buffers rather than sharing them. Surface and motion edits update uniforms in place; body and part edits use a bounded rebuild. Meshing runs on the main thread; there are no workers or shared resource caches.

## Shared part geometry

Every part family produces geometry through one engine-free path:

1. `compileTidalPart(part)` in `core/tidal-geometry.js` builds an immutable plan. Families declared in `SHARED_PARTS` dispatch by pack: original families to `classic-geometry.js` (the walker leg to `walker-geometry.js`), the 4.0 modular-content families to `legacy-shared-geometry.js`, and Tide & Sky, Strange Forms, Carapace & Bloom and Field & Settlement families to their own builders.
2. `sampleTidalPart(plan, time, pose, reuse)` writes positions and normals into separate frame buffers. Samples always start from rest data, so seeking never accumulates deformation. Mirrored parts use reflected points with corrected winding.
3. The Inspector (`review/foundation.js`) and export (`export/delivery.js`) rasterize or write these buffers directly. In the Workshop, `defaultRegistry()` registers `tidalPartFactory` from `creature/tidal-parts.js` for every `SHARED_PARTS` type, which uploads the same buffers to Three.js.

Plans built from per-range motion descriptors use a packed `version: 2` layout: one geometry per material, with vertex ranges that each carry their own hinge and phase. Simpler plans keep the `version: 1` layout. Protected details (eyes, dark grips, glowing lamp elements) keep their material when the part material changes.

`classic-catalog.js` keeps original metadata apart from factory code to avoid import cycles. `walker-geometry.js` accepts solved joints but knows nothing about the renderer or physics world: the runtime supplies terrain-aware targets, the Inspector uses diagnostic targets on a flat floor.

## Mixer model

The mixer blends data, not vertex buffers. Sources and frozen channels are validated copies. Matching is deterministic by body path, part type, host path, socket and occurrence. Numbers interpolate; graph and categorical fields switch. Pigment colors interpolate in linear light; surface layers combine by weight and are limited to four. A separate texture seed keeps mutation from changing a frozen Surface channel. Repairs and pruning produce visible notes. The limits are 8 body nodes and 32 part genes. See [mixer.md](mixer.md).

Create uses the same core mixer through `creator/generator.js`, with six channels and a separate lock model; see [creator.md](creator.md).

## Motion model

`core/motion.js` normalizes recipe weights into a scalar motion pose with independent secondary layers (breath, blink, gaze, tail, flex, jaw). Part plans and factories read that pose; the main oscillator uses the gene phase, and gain sets amplitude. Humanoids add `humanoid-motion.js`: locomotion plus one masked action layer whose samples are absolute, so scrubbing is safe.

The creature animator solves two-bone legs. In the editor, feet follow analytic stance and swing paths. In the habitat, stance feet use world targets, swing endpoints use terrain probes, and targets are clamped by IK reach. Decorative parts create no forces or constraints. The scrubber evaluates procedural animation, not recorded physics.

The Workshop loop takes frame time from `core/frame-clock.js`, which uses animation-frame timestamps only, returns zero after a reset (startup, habitat transitions, tab visibility changes), and caps a step at 0.1 s. The physics layer still rejects invalid caller time.

## Rendering and surfaces

The stage requests a WebGL2 context explicitly and passes it to Three.js `WebGLRenderer`. `main.js` requires Three.js r181 and Rapier 0.19.3 and fails with a startup panel otherwise; there is no silent engine fallback.

The skin is a `MeshStandardMaterial` with a fixed `onBeforeCompile` pattern extension. Four layer vectors carry pattern ID, scale, weight and angle; another vector carries warp. Fixed shader source avoids recompiling on slider changes; re-test the extension on GPU after changing the Three.js revision. CPU pigment (`review/pigment.js` and the pack surface modules) follows the same equations.

Microtextures are seeded 128 × 128 RGBA height data with repeated UV sampling and bump mapping. Patterns use object-space coordinates, so separate appendages can meet at visible seams. This is not a UV-bake or texture-paint pipeline.

## Physics boundary

The Rapier world runs a fixed timestep. The creature is one stabilized dynamic compound body; input becomes movement and jump impulses, and anatomy sets support height and movement metrics. Water and Air use a bounded three-axis velocity controller (`core/travel.js`), not fluid or aerodynamic simulation. Extra visuals have no colliders, and body waves do not deform the collision hull. The habitat has eight sensor collectibles, fixed scenery colliders and movable objects.

## Export boundary

`export/delivery.js`, `glb.js`, `archive.js` and `packing.js` depend on the CPU compiler, not on Three.js, Rapier or the DOM. The export captures an immutable source copy, refuses any part type outside `SHARED_PARTS`, audits every sample, enforces size limits, supports cancellation, writes standard materials and sampled morph-target motion, and reads back every emitted pose. `packing.js` changes mesh layout without changing geometry; its range map is part of the delivery record, not the gene schema. Baked assets are not skeletons. Every package contains the editable blueprint. See [export.md](export.md).

Diagnostics (`src/diagnostics/`) use real APIs only, and engine modules load only after an explicit full-check request.

## Storage and imports

| Format | Parser | Limit |
|---|---|---|
| Blueprint `.morph.json` | `parseGenome` (upgrades schemas 1–5 to 6) | 256 KB |
| Mixer recipe `.morphmix.json` (format 1) | `parseMixRecipe` | 1 MB |
| Actor `.actor.json` / roster `.roster.json` (format 1) | `parseActorManifest`, `parseActorRoster` | 1 MB / 8 MB |
| Review session `.review.json` (format 1) | `parseReviewSession` | 1.5 MB |
| Discovery collection (format 1) | `parseCollection` | 8 MB |

Browser saves are versioned keys (`morph-lab.blueprint.v9`, `morph-lab.mixer.v9`, `morph-lab.discoveries.v1`, `morph-lab.creator-session.v1`). Newer builds read older keys as a fallback and never overwrite them. Older builds cannot read newer enum values. JSON export is the reliable transfer format; storage is not cloud sync.

## Single-file build and workspaces

`scripts/build.mjs` has no bundler dependency. It turns every `src/` module into a data URL in a native import map, rewriting relative imports to `morph/...` specifiers, and inlines `style.css`, `review.css` and `creator.css` into the source `index.html`. It does not minify, so the shipped source stays readable.

- **CDN edition** (`--cdn`): the import map points `three` and `@dimforge/rapier3d-compat` at pinned jsDelivr URLs.
- **Offline edition** (`--offline`): the installed engines are embedded, together with their license and notice files. It fails if they are missing or not the pinned versions; it never silently falls back to the CDN.
- With no flag, the engines are embedded when installed and the CDN is used otherwise.

`npm run build` produces the CDN edition and `npm run build:offline` the offline edition.

`scripts/pack-workspace.mjs` wraps that application document in a launcher page: a header with **Create**, **Inspect** and **Advanced workshop** buttons, the document stored as inert data, and `scripts/workspace-shell.js`. The shell loads only the active workspace into an iframe (`srcdoc`), injecting the current blueprint, review record and creator state; switching replaces the frame, which stops its render loop. Only the active frame can request a switch (`morph-lab:workspace` messages). The starting workspace is Create unless the URL has `?creator`, `?review` or `?workshop`.

Outputs in `dist/`: `Morph-Lab.html` (the release, committed), and `runtime.html` (the unwrapped document for browser tests) plus `build-info.json`, which are not committed.

In source mode the dev server (`npm run dev`, `scripts/serve.mjs`) serves the repository and, when the pinned engines are installed, rewrites the CDN URLs in `index.html` to local `node_modules` files. Workspace changes navigate by query parameter only (`core/workspace-route.js`) and hand the blueprint over through session storage. If that storage write is blocked, the page does not navigate away from unsaved work.

## Verification boundary

Core, CPU geometry, recipe, collection and export tests run without the engines. Engine tests need the pinned packages, and GPU checks need WebGL2. A passing editor or CPU test says nothing about rendered GPU output or physics. Tests and review scripts write their reports under `test-results/` when run; see [testing.md](testing.md).
