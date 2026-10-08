# Examples

Ready-made JSON files for every Morph Lab file format. They are procedural recipes, not baked meshes or animation clips, and contain no executable code. Every file is generated through the same public functions the editor uses and passes the public parsers.

## Contents

The folder has 236 JSON files.

| Files | Count | Format |
|---|---:|---|
| `<model-id>.morph.json` | 89 | Blueprint of each library model |
| `foundation-<id>.morph.json` | 24 | The Inspector's foundation templates |
| `derived-<profile>.morph.json` | 5 | The balanced biped with each shape profile applied |
| `*-kit.morph.json` | 25 | A model with one part kit added |
| `bloom-ring-array.morph.json`, `bloom-fan-array.morph.json`, `bloom-row-array.morph.json` | 3 | Part-array layouts |
| `*.morphmix.json` | 22 | Mixer recipes |
| `*-result.morph.json` | 22 | The evaluated result of each mixer recipe |
| `*.actor.json` | 22 | Actor manifests |
| `*.roster.json` | 10 | Seeded actor rosters |
| `*.review.json` | 14 | Inspector review sessions |

## Formats

**Blueprint (`.morph.json`)** — one validated creature or humanoid: body graph or rig, part genes, surface, motion, travel and actor role. Schema 6; older schemas upgrade on import. Limit 256 KB. Open it with **Import** in any workspace.

**Mixer recipe (`.morphmix.json`)** — both source blueprints, the five channel values, locks, frozen data, body-graph rule, mutation amount and seed. Format version 1. Load it with **Import recipe** in the Workshop's Mixer tab; the matching `-result.morph.json` is what it evaluates to. See [mixer.md](../docs/mixer.md).

**Actor manifest (`.actor.json`)** — a blueprint wrapped with units, axes, rig family, sockets, action timing and compatibility data. Role values are metadata. It can be imported as a blueprint or as a mixer source. See [humanoids.md](../docs/humanoids.md).

**Roster (`.roster.json`)** — 1–24 seeded actor variants of one source, with batch settings. Importing one fills the Workshop's Actor panel; one actor is previewed at a time.

**Review session (`.review.json`)** — an Inspector record: source, candidate, pinned baseline, camera, pose settings, notes and manual decisions. Load it with **Load session** in Inspect. The example sessions are not approvals; decisions are unreviewed. See [inspector.md](../docs/inspector.md).

Create's own formats (`.discovery.json` recipes and collection backups) have no examples here; see [creator.md](../docs/creator.md).

## Where to start

- `duelist.morph.json`, `grovekeeper.morph.json` or `crownstag.morph.json` for a single model.
- `guard-kit.morph.json` (Wayfarer with the Guard kit) or `botanical-kit.morph.json` (a kit on a one-node creature).
- `carapace-glider.morphmix.json`, `salpchain-oarshrimp.morphmix.json` or `field-trailhound-hillgrazer.morphmix.json` for mixing.
- `travel-party.roster.json` for six seeded Outrider variants.
- `trailhound-task.review.json` or `moonbell-motion.review.json` for a review session.

Model IDs and contents are listed in [content-catalog.md](../docs/content-catalog.md).

## Regenerate and validate

```sh
node scripts/examples.mjs             # rewrite examples/
node scripts/examples.mjs --check     # fail if examples/ differs from the generators
node scripts/validate-examples.mjs    # parse every file with the public parsers
```

The generators live in `scripts/examples/`. The validator writes its report under `test-results/`.
