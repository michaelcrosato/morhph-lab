# Historical delivery notes — v5.0.0

These describe the previous release, not this patch.

# Delivery notes — Morph Lab v5

This release extends the supplied v4 source. The original delivered files remain unchanged. No cloud deployment, external project, or persistent Library upload was created for this release.

## Two applications

- `Morph-Lab-v5-Review.html`: a self-contained offline foundation inspector. It renders actual generated triangles with a CPU depth buffer and Canvas 2D. It loads no engine package, account, API, or reference image from the network.
- `Morph-Lab-v5.html`: the full generator, with Three.js r181 and Rapier 3D 0.19.3 loaded from pinned CDN paths. Its game renderer remains WebGL2. This is not an engine-embedded offline game build.

The archive includes the unbundled source and the corresponding builds under `dist/`. Those internal builds have the unversioned names `Morph-Lab-Review.html` and `Morph-Lab.html`. Keep paired standalone files together for the links between them. Local file storage policies can block blueprint transfer. JSON export/import is the fallback.

## What was checked

The actual offline reviewer was rendered in Chromium and inspected. The core tests, reviewer browser tests, editor-only regression checks, example validation, syntax checks, foundation batch, and catalog batch were executed. See `verification.json` for exact results, scope, and source report paths.

The defined humanoid construction corrects the merged head/chest silhouette seen in the classic construction. The same source field and primitive buffers feed the reviewer and the Three.js adapter. The adapter itself still needs engine verification. No model received production approval. Separate joints, simple limb shapes, and the heavy template's garment/waist junction need further visual work.

The catalog audit found one edge-distortion warning for Revenant in crouch. This is a prompt for inspection, not a proof of visible failure. The six foundation templates passed the specified geometry checks. A pass does not prove animation quality, complete-actor topology, self-intersection clearance, surface quality, or gameplay fitness.

## What could not be checked

Engine packages are absent in this environment. Network download attempts did not make them available. The installed browser did not provide WebGL2. The engine comparison test stopped at its missing Three.js prerequisite. The full-runtime GPU test stopped because no engine-embedded build was available. Neither result counts as a passed engine test.

Browser navigation was blocked by the test environment. Browser suites loaded the built modules through Playwright `set_content()`. The embedded reviewer test selected the review branch without navigation. Local navigation and cross-file session-storage transfer still need a normal-browser check. Transfer parsing and storage-error behavior have core tests.

The full runtime contact-sheet path is implemented but not GPU-verified. GPU shaders, complete attachments, terrain IK, full gameplay, and Rapier physics remain unverified here. CPU review covers humanoid foundations without attachment genes, and creature body surfaces only.

## Review data

The delivered session example is not approved. Browser tests used synthetic acceptance values to test invalidation; those values do not represent asset approval. Temporary accepted test-session files are not included in the source archive.

The `fnv1a32` fingerprint identifies recipe changes. It is not a secure signature, an authorship claim, or a hash of the renderer's source. Exported review records retain the recipe, settings, and generator identifier. Imported image and OBJ references stay local and are not embedded in saved sessions.

No image-generation service was called. The supplied screenshots and contact sheets show the generated geometry, not replacement artwork.
