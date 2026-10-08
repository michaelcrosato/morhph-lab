# Morph Lab v7 — Strange Forms Edition

## Start here

Open `dist/Morph-Lab-Review.html`. This is the combined Inspector and Workshop. The delivered `Morph-Lab-v7.html` is a copy of this file. **No second HTML file is needed.**

The Inspector works offline. The Workshop needs internet access to load Three.js `0.181.0` and Rapier compat `0.19.3`, plus WebGL2. If an engine cannot load, use **Return to Inspect**. No engine, browser, network, or GPU service is required for the command-line CPU geometry checks.

In Inspect, open **All 65 blueprint sources**. Select **New: Strange Forms** in the source filter. Select **Linked salp**, **Star weaver**, or **Sieve wisp**. Select **motion-cycle** and move **Pose phase**. For wide wings and radial bodies, inspect the top and raised three-quarter views. **Pin candidate as baseline**, change a part or body dimension, and compare both shapes with one camera frame.

In Workshop, open **Models**. Set **Content pack** to **New: Strange Forms**. The content filter, travel-medium filter, and search text work together. Filters do not change the current blueprint. Use **Motion** for movement weights, **Surface** for textures, and **Anatomy** for part controls. **Kits** adds groups of normal editable parts.

## New models

These are stylized procedural forms. Names are design labels, not claims of biological accuracy. All twelve have different body-node graphs and part arrangements from the earlier models.

| Water model | New structure | Main movement recipe |
| --- | --- | --- |
| Comb lantern | Eight ciliary rails around a short oval body | Comb wave |
| Linked salp | Five pump modules on a linked body | Linked pulse |
| Star weaver | A five-arm continuous radial web | Radial stroke |
| Velvet slug | A broad folded mantle and branching plumes | Radial stroke with a body wave |
| Oar shrimp | Staggered banks of paddles along a long body | Oar sequence |
| Twin jet | Two open lateral pump tubes | Linked pulse |

| Air model | New structure | Main movement recipe |
| --- | --- | --- |
| Hoop glider | Closed oval wing and suspended keel | Canopy breath |
| Sieve wisp | Two crowns of fine radial bristles | Canopy breath |
| Prism kite | Open diamond sail cells | Canopy breath |
| Screw drifter | Continuous helical ribbons | Helix turn |
| Duct skiff | Two open ducts with contra-rotating blades | Duct rotation |
| Pleat drake | Three pairs of hinged accordion wings | Pleat stroke |

The new set adds six Water and six Air models. The library now has **65 models: 17 humanoids and 48 creatures**. By configured travel mode, it has 37 Ground, 14 Water, and 14 Air models. Earlier winged models can retain Ground as their configured travel mode; a wing does not select a flight controller automatically.

## New part families and shape choices

| Part family | Three shape choices |
| --- | --- |
| Ciliary rail | Short combs, wide combs, split combs |
| Pump barrel | Barrel, nozzle, cross barrel |
| Radial web | Five arms, six arms, eight arms |
| Mantle skirt | Frilled, scalloped, split lobes |
| Swimmeret rail | Six oars, eight oars, ten oars |
| Branching crown | Three plumes, five plumes, seven plumes |
| Annular wing | Circle, oval, twin ring |
| Bristle canopy | Umbrella, double crown, bowl |
| Kite cell | Three sails, four sails, diamond cell |
| Helical vane | Single ribbon, double ribbon, triple ribbon |
| Ducted fan | Three blades, five blades, contra rotor |
| Accordion wing | Five pleats, seven pleats, nine pleats |

The total is **55 part families**. All use the existing size, length, twist, bend, phase, flex, symmetry, presence, material, and attachment controls. A changed size or length changes geometry. Flex controls the animated amount; zero flex is static. Mirrored copies retain their mirror relationship.

The six new kits are **Ciliary, Twin pump, Radial, Canopy, Annular, and Duct**. There are now **20 kits**. A kit validates the full addition first, keeps the source unchanged on failure, and uses one undo step. It appends normal part genes. It does not change travel medium, force a rig conversion, or create physical motors.

## Movement and shared geometry

The eight new recipes are **Comb wave, Linked pulse, Radial stroke, Oar sequence, Canopy breath, Helix turn, Duct rotation, and Pleat stroke**. There are now **28 movement recipes**. Humanoid actions remain at 23 plus No action; this update does not add new humanoid actions.

Comb plates and paddles have local hinges. Their phase changes along a rail. Pump walls contract without closing the tube ends. Radial webs curl and contract. Mantle edges carry travelling waves. Bristle canopies change spread. Duct blades rotate in opposite directions. Accordion wings have separate hinged panels.

Six new numeric motion channels carry these changes: `comb`, `pump`, `spread`, `spin`, `fold`, and `scull`. The existing motion mixer blends them with normalized weights. They do not contain force, velocity, or damage calculations.

All time samples start from rest geometry. Repeated time changes do not accumulate mesh errors. Body-wave settings remain separate. Attachments follow the deformed host frame. The body wave still changes visible geometry, not the collision hull.

The old API names `compileTidalPart()` and `sampleTidalPart()` remain available. They now support all **27 shared part families**: the previous 15 and the new 12. Both the CPU Inspector and Three.js adapter use these functions.

New part plans use `version: 2`. Each material component contains vertex ranges with a serializable motion descriptor. Each range can have its own hinge and phase. The ranges are packed into one geometry per material rather than one geometry per hinge. Old part plans keep their version-1 layout. No GPU performance or draw-call result is claimed.

## Textures and surfaces

The eight new pigment patterns are **comb tracks, polyp cells, fan rays, branching marks, fold bands, interference bands, tesserae, and salt flecks**. Their API keys are `combtracks`, `polypcells`, `fanrays`, `dendrite`, `foldbands`, `holofoil`, `tessera`, and `saltfleck`.

The six new generated height textures are **cilia, pleats, mesh knit, chalk, tesserae, and capillary**. The eight surface recipes are **Comb light, Colony tissue, Radial velvet, Branch hide, Pleated cloth, Interference foil, Mosaic enamel, and Salt paper**.

The totals are **34 pigment patterns, 22 microtextures, 34 surface recipes, and 26 palettes**. Up to four pigment layers remain available. The new colors and surface choices work with the existing Pigment and Surface mixer channels.

The atlas uses per-pixel CPU pigment fields with one palette and seed. The small grayscale tiles show the actual generated height maps. The fast model Inspector instead interpolates vertex pigment; small marks can appear coarse. Neither path checks the GPU material pipeline. Material names do not implement transparency, refraction, optical interference, or real iridescence.

## Mixer, actors, and compatibility

The five mixer channels, source snapshots, locks, preview, Apply, and Cancel remain. New part genes and surface enums survive serialization, mutation, and actor generation. Matching uses part type, host path, and socket. Unsupported humanoid locomotion is reported rather than treated as a compatible animation.

Water-to-Air mixing selects one travel medium. It does not calculate a physically valid hybrid. Shape variants and material classes switch between sources; compatible dimensions blend numerically. Creature-to-humanoid mixing keeps the earlier rig-selection rules.

The source includes three new complete mixer examples: **Linked salp + Oar shrimp**, **Hoop glider + Pleat drake**, and **Star weaver + Sieve wisp**. New actor manifests, six-entry rosters, kit results, and review records are also included. All **159 JSON examples** pass the public parsers.

Application version is **7.0.0**. Blueprint schema remains **6** because this pack uses the existing data layout. Versions 1–6 can be imported. Older application builds do not know the new part, pattern, or motion enum values. New `.v7` browser save slots can read `.v6` slots without overwriting them. Export a blueprint or review session before closing the file; do not depend only on local browser storage.

## Inspection evidence and limits

The Inspector draws every attachment gene on the 12 new models. The previous 16 Tide & Sky models also retain complete shared-part coverage. Earlier non-shared creature attachments and humanoid attachment genes remain outside CPU inspection; the interface reports the omissions.

Visual inspection found and corrected three new-content problems: linked pump mounts overlapped at one body exit; a mantle covered the head; and pump-wall winding needed different exterior and interior normals. Tests now cover separated pump mounts, outward and inward wall normals, mirror behavior, and output-buffer resizing.

The new-model batch uses eight time samples per model. All samples of one model use the same camera scale. Different models are fitted separately. A technical pass does not approve the silhouette, anatomy, animation appeal, self-intersections, ecological accuracy, or production use.

The existing Water and Air habitats remain bounded arcade movement modes. They do not calculate buoyancy, lift, stall, individual fin thrust, or rotor forces. One compound body controls the actor. Decorative parts do not have separate colliders. This update adds no combat, navigation, AI, ragdoll, physical cloth, baked animation export, or automatic LOD.

## Reproduce the checks

```bash
npm test
npm run test:geometry-regression
npm run examples
npm run examples:tidal
npm run examples:frontier
npm run test:examples
npm run review:frontier -- --render
node scripts/frontier-swatches.mjs
npm run gallery:frontier
npm run build
```

The gallery script needs Python and Pillow. Browser scripts need Python Playwright and Chromium. They are test dependencies, not application runtime dependencies. Use `CHROMIUM_PATH` to select a browser where the script supports it. The new frontier script supports this variable.

```bash
npm run test:frontier-ui
npm run test:ui
npm run test:review-ui
npm run test:navigation-ui
npm run test:tidal-ui
```

The Three.js and Rapier tests are separate. After a successful engine installation, run `npm run test:frontier-engine` and the earlier engine suites. Run `npm run test:shaders` and `npm run test:review-gpu` with a browser that provides WebGL2. Check full gameplay on target devices before release.

## Extension points

Use `src/core/frontier-catalog.js` for model and part metadata, `frontier-presets.js` for blueprints, `frontier-geometry.js` for mesh and animation code, `frontier-motion.js` for motion weights, and `frontier-surfaces.js` for pigment and height functions. `parametric-mesh.js` contains renderer-independent mesh helpers. `shared-parts.js` lists shared factories.

Add geometry and animation to the shared core first. Add CPU and GLSL pigment equations together. Preserve old enum order in shaders. Add tests for all shape choices, symmetry, zero-flex poses, deterministic seeking, bounded pigment values, actor exports, and mixing. Then render actual model samples before marking a manual review decision.
