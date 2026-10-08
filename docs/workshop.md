# Advanced workshop

The Workshop is the full editor and physics habitat. It renders the creature with Three.js and tests it in a Rapier world. Use it for direct anatomy editing, parts, kits, arrays, motion, surfaces, the five-channel mixer, actor data and habitat trials.

For quick rolls and saved discoveries use Create ([creator.md](creator.md)); for offline geometry checks use Inspect ([inspector.md](inspector.md)).

## Open

- Release: select **Advanced workshop** in the header of `dist/Morph-Lab.html`, or add `?workshop` to its URL.
- Source: run `npm run dev` and open `http://localhost:3000/?workshop=1`. With `npm install` done, the dev server serves the pinned engine files locally.

The Workshop needs Three.js 0.181.0, Rapier compat 0.19.3 and a WebGL2 browser. The standard (CDN) release loads both engines from jsDelivr, so it needs internet access; `npm run build:offline` produces a file with the engines embedded. There is no WebGPU or WebGL1 fallback, and the version check refuses other engine versions.

If an engine or the graphics context fails, the Workshop shows a startup error with **Return to Creator**, **Return to Inspect** and **System checks**. Run **System checks → Check engines + physics** on the computer that runs the Workshop; see [export.md](export.md#system-checks).

## Layout

- Top tabs: **01 Create** (the editor), **02 Habitat** and **03 Inspect**. **Return to monster creator** goes back to the Create workspace.
- Library tabs: **Models**, **Parts** and **Kits**. Under Models, the **Content pack** filter (All packs, Field & Settlement, Carapace & Bloom, Strange Forms, Earlier models), the **Travel medium** filter (All media, Ground, Water, Air) and text search combine. Filters never change the current blueprint.
- Inspector tabs: **Anatomy**, **Motion**, **Surface**, **Mixer** and **Actor**.
- Toolbar: Save, Export JSON, Import JSON, Undo, Redo, Mutate specimen, Frame creature, Capture image, Test creature, Export asset, System checks, and the runtime review capture buttons.

## Anatomy

Select a part family in the **Parts** library to arm it, then click the creature to place it. The **+** button adds it at the family's default anchor. On a humanoid, clicking a limb assigns that bone as the socket. **Reattach** re-arms the selected part so you can click a new mount point.

A selected part has these controls:

| Group | Controls |
|---|---|
| Proportions | Scale, Length, Twist, Bend, Variant (three shapes per family), Part material |
| Part motion | Motion gain (flex), Motion phase, Presence |
| Surface anchor | Attached to (host node), Around body, Up / down, Mirror this part; socket and socket offset on humanoids |
| Part arrays | See below |

Twist can turn a vertical tail into horizontal flukes. Zero motion gain makes a part static. A presence at or below 0.005 keeps the gene but emits no part. A blueprint holds at most 8 body nodes and 32 part genes; a mirrored gene creates two structures.

Each part grows along its local +Y from the skin. The assembler applies the anchor, surface normal, twist and a shared bend. Humanoid sockets, proportions and outfits are covered in [humanoids.md](humanoids.md).

### Part materials

| Choice | Result |
|---|---|
| Factory default (`inherit`) | The family's normal material mix |
| Skin | The body's layered skin material |
| Armor, Bone, Metal | The shared armor, bone or metal response |
| Cloth | The shared cloth response and its generated bump texture |
| Glow | The shared emissive response |

A material choice replaces structural surfaces only. Eyes, pupils, glints, dark grips, glowing lamp elements and other protected details keep their own material. All classes use the blueprint's palette; there are no per-part colors or texture seeds. Material choices survive mutation, mixing, kits, actor generation and JSON round trips.

### Kits

Open the **Kits** library and select **Add kit**. A kit expands into ordinary, independent genes in one undo step, and the new parts stay editable.

- The whole addition is checked first: rig compatibility and the 32-gene limit. A failed kit leaves the blueprint unchanged.
- Missing named hosts fall back to a valid body node. Humanoid-only kits are disabled on creatures.
- Kits append parts; they do not replace an existing loadout, so repeated kits can overlap. Delete the old parts first.
- Kits never change the travel medium, the movement recipe or the current action.

The 31 kits are listed by content pack in [content-catalog.md](content-catalog.md).

### Part arrays

Select a part, open **Part arrays**, choose a layout and axis, set the count, and select **Add part array**. The count (2–8) includes the original, so four adds three copies.

| Layout | Effect |
|---|---|
| Ring | Rotates the anchor direction around X, Y or Z |
| Fan | Spreads directions across the chosen angle (5–330°), starting at the source |
| Row | Moves copies by equal local offsets (spacing 0.02–0.6) in the part's rest body or joint frame |

**Phase step** offsets each copy's motion phase. Every copy is an independent gene: later edits to the source do not update it. The addition is one undo step, and invalid requests change nothing.

Ring and Fan need Mirror off and an anchor that does not point along the rotation axis. They are allowed only on body, head, chest and pelvis sockets; on paired joints (hands, forearms, feet) use Row, because a ring could move copies to the opposite limb. Row offsets stay within one unit per axis. The 32-gene limit applies.

## Motion

The **Motion** tab blends movement recipes by weight; the weights are normalized and all-zero means idle. It also sets six secondary gains (breathing, blinking, gaze, tail wave, soft-part flex, jaw motion; 0–2 each), **Tempo**, **Stride multiplier**, **Foot lift multiplier** and **Pair phase offset**. Recipes are parameter sets, not imported keyframe clips. The library has 37 recipes, listed by content pack in [content-catalog.md](content-catalog.md).

Use **Play/Pause**, **Reset** and the time scrubber in the viewport. Scrubbing pauses and evaluates a fixed time; it is not a physical replay.

### Travel medium

**Travel medium** selects the habitat controller: Ground, Water or Air. Wing and fin size do not change lift or thrust, and a wing does not select a flight controller by itself. Water and Air add **Cruise speed**, **Vertical speed** and **Visual bank**.

### Body deformation

**Body wave** has four kinds: Rigid, Lateral wave, Vertical wave and Pulse, with amplitude, frequency and wavelength stored in the blueprint. The humanoid skeleton ignores it.

- Every sample starts from immutable rest vertices, so scrubbing never accumulates changes.
- Attachment positions and normals follow the deformed body. Mirrored geometry reflects both shape and motion.
- Deformation changes the visible mesh only, not the collision hull.
- These are CPU vertex operations with normal updates. Model edits can regenerate topology; they are not fixed-topology morph targets.

## Surface

The skin has up to four pigment layers, each with a pattern, weight, scale, angle and warp. When the total weight exceeds 1 the contribution is normalized; all-zero weights leave base shading only. Other controls: pigment strength, roughness, metalness, emission, microtexture and microtexture relief, palette, skin and accent color.

- Microtextures are seeded 128 × 128 height textures used for bump shading. They do not change the silhouette or collision.
- Surface recipes set the primary pattern and surface response. They do not clear extra layers or change the two pigment colors.
- Patterns use object-space coordinates, so separate appendages can show seams.
- Names such as Jelly, Nacre or Wing film do not imply transparency, refraction or real iridescence; emission is not a light.

The pattern, microtexture, recipe and palette lists are in [content-catalog.md](content-catalog.md#surfaces).

## Habitat

Select **Test creature** or **02 Habitat**. The creature is one stabilized compound rigid body; decorative parts have no colliders. The habitat has eight collectible spores.

| Key | Ground | Water or Air |
|---|---|---|
| W A S D or arrows | Move relative to the camera | Move in the horizontal plane |
| Space | Jump | Rise |
| E | — | Rise |
| Q or Control | — | Descend |
| Shift | Sprint | Horizontal speed boost |
| R | Return to start; keep collected spores | Same |
| Escape | Back to the editor | Same |

**Ground** uses the upright creature controller: stance feet use world targets, swing feet use terrain probes, and targets are clamped by IK reach. **Water** and **Air** open a reef tank or sky course with spores at different heights, and use a bounded three-axis velocity controller with soft height and radius limits. The actor's speed value scales horizontal speed.

This is an arcade controller, not a fluid or aerodynamic solver: no buoyancy, displacement, lift, drag from wing area, stall or fin thrust. The body turns in yaw; bank is visual. Visual actions do not move or resize the collider.

## Saving and files

**Save** (Ctrl/Cmd+S) keeps the blueprint in local browser storage; the Workshop reads saves from older versions without overwriting them. Local storage is not a backup: use **Export JSON** for a `.morph.json` blueprint and **Import JSON** to load one. A blueprint is limited to 256 KB. **Capture image** saves a PNG of the view, for reference only. **Export asset** opens the GLB exporter ([export.md](export.md)).

## Keyboard shortcuts

| Key | Action |
|---|---|
| Ctrl/Cmd+S | Save |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y | Redo |
| Delete or Backspace | Remove the selected structure |
| F | Frame the creature |
| Escape | Cancel placement; in the habitat, return to the editor |

## Limits

- No AI, navigation, combat, ragdoll, physical cloth, crowd simulation or automatic LOD.
- Meshing and part updates run on the main thread.
- Equipment fit, overlaps and body intersections are not solved automatically; check them visually after large edits.
