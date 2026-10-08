> Earlier-release guide. For current schema 5, foundation inspection, and verification limits, read [FOUNDATION-GUIDE.md](FOUNDATION-GUIDE.md).

> This guide describes the earlier foundation. For current v4 content counts, new actions, materials, kits, and migration rules, read [CONTENT-GUIDE.md](CONTENT-GUIDE.md).

> Version 3: See [HUMANOID-GUIDE.md](HUMANOID-GUIDE.md) for rig families, humanoid actions, sockets, actor exports, and compatibility rules. The sections below describe the shared creature systems. Schema 3 extends the previous schema.

# Mixer guide

## Three related tools

The **Mixer** combines two complete creature recipes. The **Surface** inspector combines pattern layers within one creature. The **Motion** inspector combines movement states and secondary motion. These tools share the saved blueprint but use separate controls.

## A/B source selection

Each source slot accepts a built-in model, a captured current creature, or an imported `.morph.json` blueprint. Sources are snapshots. A preview does not change its own sources. Select **Capture current** to deliberately use the current result as a new parent.

The **Captured creature** option also captures the current creature when selected. The **Imported recipe** option opens the blueprint file picker for that source. This source file is a creature blueprint, not a full mixer recipe. Full `.morphmix.json` files use **Import recipe** at the bottom of the panel.

Changing a source during an active preview recomputes the preview. Importing an invalid source or recipe produces an error without replacing the saved mixer input.

## Channel meanings

| Channel | What changes | What stays separate |
|---|---|---|
| Body | Body graph selection, paired radii, paired offsets | Part count and appearance |
| Parts | Paired part size, length, anchor, bend, gain, phase, presence | Body node dimensions |
| Pigment | Base color and accent color, mixed in linear light | Pattern layers and surface response |
| Surface | Weighted patterns, roughness, metalness, relief, emission, microtexture and texture seed | Base and accent colors |
| Motion | State weights, secondary gains, tempo, stride, lift, pair phase | Physics controller and physical forces |

A channel value of 0 selects A. A value of 1 selects B. An endpoint selects that channel's data, not necessarily the whole original file. The result gets a combined name, a generation number, and the mixer seed.

### Master and locks

**All unlocked channels** sets the five unlocked channel values together. Lock a channel to freeze its current preview or current creature data. The locked slider is disabled. Changes to the sources or master do not change the frozen data. A parts lock still permits host remapping when the body graph changes. Lock **Body** and **Parts** together to retain both the structure and its attachment graph.

The recipe stores frozen data, not just a lock flag. A saved recipe can therefore reproduce a locked result on another device. Unlocking a channel returns control to its A/B slider. The next preview recomputes it.

### Body graph selection

**Auto** uses the A graph below 0.5 and the B graph at or above 0.5. The control label abbreviates this as A below 50%, B above. **Keep source A graph** and **Keep source B graph** force the graph choice but still blend dimensions of matched nodes.

Nodes match by structural path: root, child number, and descendant number. Siblings are sorted by ID. This is a deterministic rule, not semantic understanding of a head or torso. For a custom family, preserve a consistent hierarchy and stable sibling IDs.

Only matching nodes interpolate. Unmatched nodes come from the chosen graph. Offsets can be shortened to retain parent overlap or workspace bounds. The mixer reports repairs. The result always passes the blueprint validator before entering the editor.

### Attachment matching

Attachments match by type, source-host structural path, and occurrence within that group. Matching sizes, lengths, bend, phase, motion gain, and anchors blend. Angles use the short path. Opposite anchors use a defined rotation path instead of a zero vector.

Unmatched attachments scale with source weight. They are not made transparent. Very small presence values are omitted from the runtime. Shape choice and mirror state switch at 0.5. Missing hosts remap to the nearest surviving ancestor, or the root.

When a blend exceeds 32 genes, the most visible genes are retained. The mixer reports the limit. This can cause a discrete change in the part set.

## Surface mixing

Up to four pattern layers are active. Each layer has a pattern, weight, scale, angle, and warp. Matching source layers merge when their pattern and numeric settings match. Other layers remain separate. If the mix needs more than four layers, the strongest four are retained and reported.

Weights combine the pattern contribution. When total weight exceeds 1, the combined contribution is normalized. All zero weights remove the patterned contribution. The skin still has its base shading and subtle procedural variation.

Microtextures are small generated height textures used for bump detail. They do not alter the silhouette. Microtexture type and texture seed switch between A and B at the surface midpoint. Pattern seed is separate from mutation seed. Locking Surface therefore also freezes its pattern seed.

The six material recipes change the primary pattern and surface response. They do not clear extra layers or change the two pigment colors. Remove unwanted extra layers explicitly.

## Motion mixing

The eight states are parameter recipes, not imported keyframe clips. Their weights are normalized before evaluation. All-zero state weights produce idle. The six secondary gains are independent and range from 0 to 2.

Tempo changes the procedural clock. Stride changes step reach. Foot lift changes swing height. Pair phase changes the relative timing of successive leg pairs. Individual parts also have a motion gain and phase. Phase is a cycle offset for each family's main oscillator, not a common keyframe index.

Use **Play/Pause**, **Reset**, and the time scrubber in the viewport. Scrubbing pauses the preview and evaluates a fixed time. It is not a physical replay or exported animation clip. Editing a motion recipe while paused can change the evaluated pose.

The habitat still uses its physical movement speed to drive locomotion. Idle input stops walking in place. Swim and hover remain visual states. They do not add water, lift, or gravity changes.

## Repeatable variation

The variation seed is an unsigned 32-bit integer. With identical source files, settings, frozen values, and seed, the core mixer returns the same blueprint in this implementation.

The variation amount changes unlocked body scale and unlocked part size, length, and bend. It does not invent new part families or graphs. **Randomize channels** advances the seed and selects new unlocked channel values. The sources remain unchanged.

This repeatability applies to blueprint generation. It is not a claim that all GPU pixels or physics runs are identical across machines.

## Preview and history

Slider changes remain inside one preview transaction. **Apply mix** commits one undo entry. **Cancel** restores the pre-preview creature without an undo entry. Undo and redo apply to the creature blueprint, not the A/B source selection controls.

Switching inspector tabs, saving a blueprint, loading another model, or entering the habitat commits a pending preview. Use Cancel before those actions to discard it. This behavior avoids leaving an invisible pending editor transaction.

## File formats

| File | Contents | Use |
|---|---|---|
| `.morph.json` | One validated creature, surface recipe, and motion recipe | Share the finished result |
| `.morphmix.json` | A and B source blueprints, five channels, locks, frozen data, graph rule, mutation, seed | Reproduce or revise a mix |
| `.png` | Rendered camera capture | Visual reference only |

Blueprint schema 1 is read and upgraded to schema 2. A mixer recipe has its own format version 1. These version numbers refer to different file formats.

Use the source examples to start. `carapace-glider.morphmix.json` mixes armor and wings. `reef-lantern.morphmix.json` mixes a gill body with luminous feelers. `grazer-sentinel.morphmix.json` mixes a long walker with spines and a club tail. The matching result files contain the evaluated blueprints.
