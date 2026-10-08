# Mixer

The Workshop's **Mixer** tab combines two complete creature recipes into a new blueprint. It mixes data (dimensions, parts, colors, surfaces, motion), not vertex buffers. The **Surface** and **Motion** tabs mix pattern layers and movement recipes within one creature; they share the saved blueprint but have separate controls.

The Create workspace has its own simpler mix with six channels (body, head attachments, other attachments, surface, colors, motion) and saved discoveries as parents; see [creator.md](creator.md#mix). Both use the same core mixer rules described here.

## Sources

Each slot, A and B, holds a built-in model, a **Captured creature** (the current result) or an **Imported recipe** (a `.morph.json` blueprint or `.actor.json` manifest, via **Import JSON**). Sources are snapshots: a preview never changes its own sources. Select **Capture current** to use the current result as a new parent on purpose.

A full `.morphmix.json` recipe is loaded with **Import recipe** at the bottom of the panel. Changing a source during a preview recomputes it. An invalid source or recipe is rejected without replacing the current mixer input.

## Channels

| Channel | Changes | Leaves alone |
|---|---|---|
| Body | Body graph selection, paired radii and offsets; for humanoids the rig family, proportions, structural nodes, outfit/head/hand choices and role profile | Part count and appearance |
| Parts | Paired part size, length, anchor, bend, gain, phase, presence, socket and socket offset | Body node dimensions |
| Pigment | Base and accent color, mixed in linear light | Pattern layers and surface response |
| Surface | Weighted patterns, roughness, metalness, relief, emission, microtexture and texture seed | Base and accent colors |
| Motion | Recipe weights, secondary gains, tempo, stride, lift, pair phase, travel medium, body wave and humanoid gait/action settings | Physics controller and forces |

A channel value of 0 selects A and 1 selects B. An endpoint selects that channel's data, not the whole source file. **100% A**, **50 / 50** and **100% B** set all channels at once. The result gets a combined name, a generation number and the mixer seed.

### Master and locks

**All unlocked channels** moves every unlocked channel together. Locking a channel freezes its current data and disables its slider; source and master changes no longer affect it. The recipe stores the frozen data, not just a flag, so a locked result reproduces on another device. Unlocking returns control to the slider.

A Parts lock still allows host remapping when the body graph changes. Lock **Body** and **Parts** together to keep both the structure and its attachment graph. Lock **Motion** to keep the current travel recipe while mixing appearance or anatomy.

## Body graph

**Body graph** has three choices:

- **A below 50%; B above** (auto): the A graph below 0.5, the B graph at or above it.
- **Keep source A graph** / **Keep source B graph**: force the graph but still blend dimensions of matched nodes.

Nodes match by structural path (root, child number, descendant number), with siblings sorted by ID. This is a deterministic rule, not semantic matching of heads or torsos; keep a consistent hierarchy and stable sibling IDs in related models. Only matched nodes interpolate. Offsets can be shortened to keep parent overlap or workspace bounds; the mixer reports these repairs. Every result passes the blueprint validator. The limits stay at 8 body nodes and 32 part genes.

For a humanoid/creature pair the body family switches discretely; it never interpolates incompatible skeletons or retargets actions. Matching humanoid proportions blend continuously, and discrete choices switch at the midpoint. Humanoid joint sockets fall back to their body host on creature rigs. Unsupported leg genes and actions are kept with notes.

## Attachments

Attachments match by part type, source-host structural path, socket, and occurrence within that group. Matched sizes, lengths, bend, phase, motion gain and anchors blend; angles take the short path and opposite anchors use a defined rotation instead of a zero vector.

- Unmatched attachments scale with source weight; they are not made transparent. Very small presence values are omitted.
- Variant, part material and mirror state switch at 0.5.
- Missing hosts remap to the nearest surviving ancestor, or the root.
- If a blend exceeds 32 genes, the most visible genes are kept and the mixer reports it. This can cause a discrete change.

Matching is structural, not by purpose: two same-type parts on different humanoid joints are separate genes.

## Surface mixing

Up to four pattern layers are active, each with pattern, weight, scale, angle and warp. Matching source layers merge; others stay separate. If more than four are needed, the strongest four are kept and reported.

Microtexture type and texture seed switch between A and B at the surface midpoint. The pattern seed is separate from the mutation seed, so locking Surface also freezes it.

## Motion mixing

Recipe weights are normalized before evaluation; all-zero weights produce idle. The six secondary gains are independent (0–2). Tempo changes the procedural clock, stride the step reach, foot lift the swing height, and pair phase the timing between leg pairs. Each part also has its own motion gain and phase.

Travel medium and body-wave kind switch at the midpoint; numeric travel and wave settings interpolate. A Water/Air or cross-medium mix selects one medium; it does not create a hybrid physical system, and the mixer adds a note.

## Seeded variation

**Mutation amount** varies unlocked body scale and unlocked part size, length and bend. It does not invent part families or graphs. **Seed** is an unsigned 32-bit integer. **Randomize unlocked channels** advances the seed and picks new unlocked channel values; sources stay unchanged.

With identical sources, settings, frozen values and seed, the mixer returns the same blueprint. This applies to blueprint generation, not to GPU pixels or physics runs.

## Preview and history

Slider changes stay inside one preview transaction. **Apply mix** commits one undo step; **Cancel** restores the pre-preview creature with no undo entry. Undo and redo apply to the creature, not the source selections.

Switching inspector tabs, saving, loading another model or entering the habitat commits a pending preview. Use Cancel first to discard it.

**Save on device** and **Recall saved** keep one recipe in local browser storage. Use **Export recipe** for a portable file.

## Files

| File | Contents |
|---|---|
| `.morph.json` | One validated creature with its surface and motion recipes |
| `.morphmix.json` | Both source blueprints, channel values, locks, frozen data, graph rule, mutation and seed |
| `.png` | A view capture, for reference only |

Mixer recipes are format version 1 (1 MB limit); embedded blueprints upgrade to schema 6 through the normal validator. The two version numbers refer to different formats.

The [examples](../examples/README.md) folder has 22 mixer recipes, each with a matching `-result.morph.json`. Good first files: `carapace-glider.morphmix.json` (armor and wings), `reef-lantern.morphmix.json` (gill body and luminous feelers) and `grazer-sentinel.morphmix.json` (long walker with spines and a club tail).

## From code

```js
import {preset} from './src/core/presets.js';
import {defaultMixSettings, mixGenomes, createMixRecipe, parseMixRecipe}
  from './src/core/mixer.js';

const settings = defaultMixSettings();
settings.topology = 'a';
settings.channels.body = 0.25;
const {genome, notes, stats} = mixGenomes(preset('carapace'), preset('glider'), settings);
```

`mixGenomes(a, b, settings, frozen)` validates its inputs and returns `{genome, notes, stats}`. Keep and show `notes`: a valid result can still involve graph repair or pruning. Use `createMixRecipe` to save the full configuration and `parseMixRecipe` for imported JSON. None of this needs Three.js, the DOM or local storage.
