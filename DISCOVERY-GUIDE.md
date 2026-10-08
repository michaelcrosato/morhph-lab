# Morph Lab v12 — Creator workflow and timing fix

## What changed

This release implements the requested interface and fixes the reported Workshop clock defect. It is not an edited screenshot. The creator and all thumbnail cards draw the existing procedural geometry.

The default HTML now opens **Create**. Inspection and advanced anatomy/physics tools remain available from the persistent workspace bar. All three modes are in one HTML file. Workspace changes do not open a sibling file.

No library models were added or removed. The 89 model recipes, 73 part families, schema 6 blueprints, Three.js r181 pin, Rapier compat 0.19.3 pin, and WebGL2 requirement for the advanced Workshop remain.

## The timing defect

The old loop stored `performance.now()` during startup and habitat transitions. The next animation-frame callback could carry an earlier timestamp. Subtraction then produced a negative frame interval. The physics layer correctly refused that value and displayed the error in the supplied screenshot.

`FrameClock` now uses consecutive animation-frame timestamps only. A reset waits for the first callback and returns zero. Missing, nonfinite, negative, repeated, and backward timestamp inputs cannot advance physics with a negative interval. Long intervals are capped at 0.1 second. Startup, both habitat transitions, and tab visibility changes reset the clock. Rebuild throttling still uses `performance.now()` on both sides of its separate interval.

The physics error check remains active. This patch fixes the caller instead of concealing a faulty simulation input. The tests exercise the old failure sequence, resets, tab suspension, interval bounds, and the actual source integration. Full Rapier gameplay was not available in the authoring environment.

## Explore and keep

**Randomize monster** chooses from the selected source pool and changes the source's dimensions, part variants, surface, palette, and motion settings. The pools are All creatures, Land creatures, Swimmers, Fliers, Humanoids, and Everything.

**Vary current** starts from the visible creature. It blends a limited amount of a compatible source into a modified parent. The Variation amount slider controls the distance from that parent. Zero leaves the result unchanged. The variation path retains the parent's rig family and travel medium.

**6 variations** creates six candidates from one fixed parent. Candidates are not generated from each other. The current creature and saved collection do not change until a candidate is selected. Selecting a candidate creates one history step. Save it to keep that branch.

Every normal change has Undo and Redo. There are up to 40 recent steps. Undo in a mixer preview cancels that preview first. It does not also undo the preceding committed change. History does not survive switching workspaces or reopening the page. The current model, saved collection, parent snapshots, and settings do survive an in-file workspace switch.

## Seeds and individual traits

Turn off **New seed on each roll** to repeat an operation. Enter a whole number from 0 to 4294967295. The same operation, source snapshots, seed, amount, and locks reproduce the same result. A seed alone cannot reproduce an arbitrary descendant of a saved creature.

The six trait controls are:

| Trait | Scope |
|---|---|
| Body | Body dimensions and rig proportions, including the head shape |
| Head parts | Head-mounted and face/eye attachments |
| Other parts | Other appendage and equipment genes |
| Surface | Pattern layers, roughness, microtexture recipe, relief, and emission |
| Colors | Base and accent pigment |
| Motion | The procedural motion recipe and its settings |

A single-trait roll holds the other channels. It does not change the global geometry seed. A Body roll retains the existing attachment definitions while the mounts follow the changed body. The Body control does not add or remove body nodes during an isolated roll.

A lock holds that trait against the fixed current snapshot during randomization and mixing. A head/other-part lock also holds the body and rig so its host IDs and sockets remain meaningful. The interface states this dependency and disables a Body-only roll until those locks are released. The Body lock does not automatically freeze all appendages.

## Saved discoveries

Select **Save discovery** to copy the current blueprint and its recipe into the collection. Exact duplicate blueprints are not added twice. New saves do not overwrite earlier entries. Editing a loaded discovery changes the current working copy only. Save again to keep a new branch.

Each saved card offers Load, Favorite, A, B, and Remove. Removal requires confirmation. Removing a saved card does not delete the current creature or a mixer parent that was already captured from it. Search and Favorites filter the display only.

The collection stores up to 48 discoveries. There is no automatic eviction. At capacity, export a backup and remove an unwanted entry before adding another. Thumbnails are regenerated from the blueprints and are not embedded in the backup.

The collection normally uses local browser storage. Storage can be unavailable, denied, or full. The interface reports that condition and keeps the collection in memory for the current page. A corrupt existing save is not overwritten. New entries in that case remain in memory until exported. Closing the browser without a backup can lose a memory-only collection.

Use **Back up collection** to save a JSON file. **Import collection** validates the entire file before merging. It retains current entries, ignores exact duplicate blueprints, and resolves record-ID collisions. Invalid or oversized input, or an import that would exceed capacity, leaves the collection unchanged. The file limit is 8 MB.

## Mix from your collection

Set A or B using a saved card, the parent selector, or **Use current**. The parent slots contain independent copies. They do not track later edits to the current creature or saved cards.

Move Blend amount to preview the mix. The master slider changes unlocked channels. Open **Separate blend channels** to set body, head attachments, other attachments, surface, colors, and motion separately.

Every slider calculation starts from the same parents and pre-preview snapshot. Changes do not accumulate accidental mutations. Select **Keep mix** for one undo step. Select **Cancel** to restore the previous creature. Save discovery also commits a pending preview before copying it into the collection.

Randomize and variation buttons are disabled until the mix is kept or cancelled. Parents and saved discoveries never change as a side effect of sliding.

This is recipe mixing, not arbitrary mesh morphing. Different body graphs and humanoid/creature rigs switch between sources. Attachments remap through the existing host/socket rules. Incompatible or inactive genes remain subject to the existing compatibility and export checks. The 32-gene limit remains in effect.

## View and export

The preview supports Color, Clay, Wire, Fit view, drag rotation, wheel zoom, motion phase, playback, and turntable rotation. CPU playback is throttled and is not a real-time frame-rate benchmark.

The creator starts with actual CPU geometry. It attempts the pinned Three.js WebGL2 viewer when the browser provides a WebGL2 context. That viewer does not import Rapier. A failed engine load or lost graphics context returns to the CPU preview instead of blocking randomization or saving. **Try WebGL2** retries the optional view.

The CPU preview does not reproduce custom GPU shaders, fine texture detail, shadows, or all material effects. It is not an illustrated replacement model. The actual WebGL2 view uses the existing Three.js assembly and materials.

**Export blueprint** writes the current editable schema-6 creature. **Export roll / mix recipe** includes both sources, the frozen lock source, the result, channel settings, operation, and seed. Imported discovery recipes are recomputed and checked against their saved result. A renamed discovery can retain a valid recipe.

**Build GLB asset** opens the existing checked exporter. Its coverage checks, warning acknowledgements, source-preserving ZIP package, and binary readback checks remain active. Its animation is sampled vertex animation, not a retargetable skeleton. Fine GPU texture baking is not added in this release.

## Source project and patch

The source ZIP contains the complete project and generated HTML under `dist/`. The separately supplied source patch is relative to the supplied v11 project root. It does not include the large generated HTML files. Apply it only to the matching baseline, or review the diff against local changes first:

```sh
git apply --check Morph-Lab-v12.patch
git apply Morph-Lab-v12.patch
npm test
npm run build -- --cdn
```

For local development:

```sh
npm install
npm run dev
```

Open `http://localhost:3000/`. Do not open the source `index.html` with a file URL. For direct file use, open `dist/Morph-Lab.html` or the separately supplied combined HTML.

No matching remote Morph Lab repository was identified in the connected account. The delivery updates the supplied source project and HTML, not an unrelated repository. There was no remote push.

## Verification scope

`verification.json` records the actual final test results. Tests cover source compatibility, individual traits, locks, fixed parents, deterministic batches, undo transactions, collection merge and limits, storage failures, actual rendered CPU pixels, recipe/collection downloads, GLB export, and recovery from an unavailable Workshop.

Browser tests use the exact packaged HTML and its real buttons. They do not mock Three.js or Rapier. They use `set_content` because direct URL navigation was blocked by the test environment. Real browser-origin persistence, direct Windows file launching, the WebGL2 preview, and full Rapier gameplay remain unverified there. Successful storage writes and failure cases are tested separately through the collection module's injected storage interface.

The earlier Abyss angler and Revenant deformation warnings are not repaired by this UI and timing update. Model quality still needs inspection before production use. The image-generation mockup from the prior conversation is not part of the shipped renderer or saved collection.
