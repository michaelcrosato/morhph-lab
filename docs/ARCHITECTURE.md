# Version 10 delivery boundary

The following modules were added without changing the content compiler or gameplay controller.

- `src/export/delivery.js`: immutable source capture, strict geometry coverage, audits, size limits, cancellation, standard materials, sampled animation, and full exported-pose readback.
- `src/export/glb.js`: aligned binary glTF writer and a restricted delivery-file reader.
- `src/export/archive.js`: deterministic ZIP STORE, CRC32, SHA-256, safe filenames.
- `src/export/panel.js`: browser delivery controls. No edits to the blueprint store.
- `src/diagnostics/runner.js`: real capability, GLSL, engine, render, and controller checks. Engine modules load only after explicit full-check action.
- `src/diagnostics/panel.js`: local report UI, including the startup-error path.
- `src/ui/tool-dialog.js`: shared modal and local download helper.

Core export code depends on the CPU compiler, not Three.js or Rapier. Baked assets are not skeletons. Keep editable blueprint data in each delivery. Missing geometry is a hard gate.

The sections below describe the earlier generator architecture. Read DELIVERY-GUIDE.md for the version 10 boundaries and verification scope.

---

> Current version: schema 5. See [FOUNDATION-GUIDE.md](FOUNDATION-GUIDE.md) for the shared geometry and inspection paths. Read [CONTENT-GUIDE.md](CONTENT-GUIDE.md) for the new content modules and [HUMANOID-GUIDE.md](HUMANOID-GUIDE.md) for the humanoid foundation.

# Architecture

## Data and runtime boundaries

The validated blueprint is the source of truth. The UI never stores a Three.js object, Rapier handle, shader, or executable function in a blueprint. Imports reconstruct allowed fields, reject invalid types, and check graph and resource limits.

```text
A blueprint + B blueprint + settings + frozen values
                         |
                  core/mixer.js
                         |
             validated schema 5 blueprint
                 /               \
       core/anatomy.js          core/store.js
          /         \               |
 body mesher      part genes     editor history
       \          /                  |
     creature/assemble.js       UI controls
       |         |
    materials   animator + IK
       |
    WebGL2 stage

Anatomy analysis + level -> physics/world.js -> Rapier controller
```

`core/mixer.js`, `core/motion.js`, `core/surfaces.js`, `core/anatomy.js`, and the body mesher have no engine or DOM dependency. `editor/mixer-controller.js` adds preview/history handling and optional browser storage. Graphics factories have no UI or physics dependency.

## Coordinates and identity

Units are metres, seconds, and radians. The frame is right-handed with Y up and +Z toward the face. X is the bilateral axis. Body nodes have parent-relative offsets and ellipsoid radii. Node-local rotation is not supported.

Gene IDs are persistent. A mirrored gene creates separate runtime instances with one shared gene ID. Runtime UUIDs and physics handles do not enter saved data. Local symmetry mirrors around the host node; it does not mirror the full body graph.

An attachment stores a direction from its host centre. Anatomy compilation projects this direction onto the connected implicit skin and computes an outward normal. It does not store a triangle index. Attachments therefore survive remeshing.

The ellipsoid field is a conservative approximation combined with a smooth minimum. It is not an exact signed-distance metric. Body surface generation and attachment projection use the same field.

## Mesh generation and ownership

`core/mesher.js` produces typed-array positions, normals, UVs, and indices using marching tetrahedra. Edge intersections are shared. The Three.js adapter creates a BufferGeometry from those arrays. Normals follow the field gradient.

A Creature owns its mesh, materials, texture, geometry kit, and part objects. `dispose()` releases unique resources and can be called twice safely. When the body node data is unchanged, a rebuilt Creature clones the previous body buffers. It does not share their lifetime.

Surface and motion edits reuse the current runtime. Uniform and material properties update in place. A microtexture changes only when its type or texture seed changes. The old texture is disposed. Body and part edits use the bounded rebuild path. Meshing and flexible-tube updates still run on the main thread; workers and shared resource caches are not implemented.

## Mixer model

The mixer blends **data**, not vertex buffers. Sources and frozen channels are validated copies. Matching is deterministic by body path, part type, host path, and occurrence. Numeric fields interpolate; selected graph and categorical fields switch. Opposite direction vectors have an explicit safe path.

Pigment colors interpolate in linear light. Surface layers combine by weight and are limited to four. A separate texture seed prevents mutation settings from changing a frozen Surface channel. Body-overlap repairs, part pruning, and layer pruning produce visible notes.

The graph limit remains 8 nodes and 32 part genes. A graph change can cause a visible step. The system does not promise semantic matching or continuous topology morphing. Read the mixer guide before building a production breeding or inheritance system around it.

## Motion model

`core/motion.js` normalizes eight state weights into a scalar motion pose. Six secondary layers retain independent gains. Each factory receives `update(time, speed, pose)`. The main oscillator uses the gene phase; gain controls its amplitude. Static parts omit update.

The animator solves two-bone legs. In the editor, feet follow analytic stance and swing paths. In the habitat, stance feet use world-space targets, swing endpoints use terrain probes, and targets are clamped by IK reach. Decorative parts do not create forces or constraints.

The time scrubber evaluates procedural animation, not recorded physics. Swim and hover are pose recipes. There are no flight, buoyancy, motor-joint, or balance solvers.

## Rendering and surface detail

The stage explicitly requests WebGL2 and passes the context to Three.js WebGLRenderer. Version checks require r181 and Rapier 0.19.3. Context or initialization errors show a failure panel rather than silently switching engines.

The skin uses MeshStandardMaterial plus a fixed `onBeforeCompile` pattern extension. Four uniforms carry pattern ID, scale, weight, and angle. A second vector carries warp. Fixed shader source avoids compilation for each slider change. The extension must be GPU-tested after changing the Three.js revision.

Microtextures are generated 128 by 128 RGBA height data. They use repeated UV sampling and bump mapping. Pigment patterns use object-space coordinates. Individual appendages have independent local coordinates, so patterns can meet at visible seams. This is not a production UV-bake or texture-paint pipeline.

## Physics boundary

The existing Rapier world runs a fixed timestep. The creature is one stabilized dynamic compound body. Input creates movement impulses and a jump impulse. Anatomy controls support height and movement metrics. Extra visuals have no independent collision or muscle simulation.

The habitat includes sensors for eight collectibles, fixed scenery colliders, and movable objects. The editor can recompile a creature without persisting physics handles. The current framework is useful for a creature editor or prototype game; it is not a general soft-body evolution simulator.

## Storage and imports

`parseGenome` checks the byte limit and upgrades version 1 data. `parseMixRecipe` checks its own format and 1 MB limit, then validates both source blueprints, settings, and frozen data. Files contain only data. Invalid recipes do not replace the active recipe.

The v2 save key is separate from the v1 key. JSON export is the reliable transfer format. Mixer save uses a separate browser key and includes all source snapshots. It is not cloud sync.

## Verification boundary

Pure core and editor-only tests run without the engines. Engine tests require actual pinned packages. GPU tests require WebGL2. Never infer a rendered result from a passing editor test. See `test-results/verification.json` for the checked and unchecked layers in this delivery.


## Foundation review in v5

`core/foundation-shapes.js` supplies a shared, pure detail plan and primitive buffers. Both `creature/humanoid-runtime.js` and `review/foundation.js` consume it. Defined humanoids use the same derived neck field in body meshing and surface attachment projection.

`review/math.js`, `review/audit.js`, `review/raster.js`, and `review/obj.js` have no DOM or engine dependency. `review/app.js` owns browser controls and reference-file lifetimes. `review/session.js` keeps sources, a candidate, a pinned baseline, and manual decisions separate. `scripts/review.mjs` uses the same compiler for headless PNG and audit output.

`render/review-capture.js` is a distinct Three.js adapter. It captures the actual full-runtime creature and records its evidence separately. The CPU reviewer never reports a shader or physics pass.
