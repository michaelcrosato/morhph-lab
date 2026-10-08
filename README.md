# Morph Lab v11 — Complete Coverage

A procedural creature and NPC generator with an offline geometry Inspector, a WebGL2 Workshop, a five-channel recipe mixer, and checked GLB delivery.

This release completes the shared geometry path for all **73 part families and 89 presets**. It also adds lossless export grouping by material, explicit records for inactive genes, and version-aware review decisions. Older approvals reset without losing model data or notes. No content recipes were added or removed.

## Open

The delivered `Morph-Lab-v11.html` contains both Inspect and Workshop. It starts in Inspect. No second HTML file is needed. Inspect and asset export work offline. The Workshop needs the pinned engine packages and WebGL2.

For the source version:

```sh
npm install
npm run dev
```

Open `http://localhost:3000/review.html`. Dependencies are pinned to Three.js **0.181.0** and Rapier compat **0.19.3**. There is no WebGPU or WebGL1 fallback. The CPU Inspector is a separate review tool.

## Export

Select **Completed: original models** in the Inspector's source filter. Choose Mossback, Glider, Tendril, or Fiend. Open **Export asset**. Select a static pose or baked motion, then select **Group by material** or **Separate meshes**.

```sh
node scripts/export-asset.mjs --preset mossback --motion --layout material --out output/mossback
```

Keep the source blueprint. GLB motion is sampled vertex animation, not a reusable skeleton. Grouping changes mesh-node granularity, not the geometry. It does not reduce triangles or add LODs.

## Test

Core tests and export checks need no engine installation:

```sh
npm test
npm run test:examples
npm run audit:exports
npm run review:coverage
```

Generate delivery fixtures, then use an independent importer:

```sh
npm run review:packing
npm run test:packing-import
```

The independent importer needs Python, NumPy, and trimesh. UI tests need Python Playwright and Chromium. Set `CHROMIUM_PATH` when the executable is not `/usr/bin/chromium`.

```sh
npm run build -- --cdn
npm run test:all-ui
```

With the real engines installed:

```sh
npm run doctor
npm run test:coverage-engine
npm run test:engine
npm run build -- --offline
```

The last command refuses to substitute CDN files when the engine files are missing.

## Read

See **COMPLETE-COVERAGE-GUIDE.md** for the changes, controls, export limits, migration notes, and test commands. See **verification.json** for measured results and file hashes. Earlier release notes are historical and do not describe current coverage.

No technical test grants visual approval. GPU rendering and Rapier gameplay remain unverified in the authoring environment. Use the application's **System checks** on the computer that will run the Workshop.

The known Abyss angler and Revenant deformation warnings remain. There is no new skeletal export, texture baking, automatic equipment fit, AI, combat, ragdoll, or physical limb simulation in this release.

Authored source is MIT-licensed. No font files are included.
