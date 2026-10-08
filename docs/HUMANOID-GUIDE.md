> Earlier-release guide. For current schema 5, foundation inspection, and verification limits, read [FOUNDATION-GUIDE.md](FOUNDATION-GUIDE.md).

> This guide describes the earlier foundation. For current v4 content counts, new actions, materials, kits, and migration rules, read [CONTENT-GUIDE.md](CONTENT-GUIDE.md).

# Morph Lab v3 — Humanoid and actor guide

## Scope

Version 3 adds a distinct humanoid rig to the existing creature generator. Both families share blueprints, materials, part factories, the mixer, undo/redo, and export controls. Each family uses its own animation adapter.

The editor creates reusable actor recipes. It does not implement an NPC AI or combat system. Review the capability report before passing an actor to another game.

**Verification boundary:** core algorithms and editor workflows are tested. Actual engine rendering, GPU shaders, Rapier gameplay, and the offline build were not verified in the authoring environment. The included engine tests require the exact dependencies. Do not treat the editor-harness screenshot as a rendered character.

## Humanoid library

| Model | Base purpose | Main differences |
|---|---|---|
| Wayfarer | Civilian NPC | Balanced proportions and tunic |
| Warden | Guard | Armored outfit and guard role |
| Ranger | Scout | Longer legs and lighter proportions |
| Goblin | Small enemy | Reduced scale and clawed hands |
| Ogre | Brute | Broad body, large arms, and tusks |
| Revenant | Stalker | Forward posture and creep movement |
| Golem | Sentinel | Stone surface and heavy proportions |
| Fiend | Monster | Horns, tail, and carapace outfit |
| Arcanist | Caster | Hood, luminous surface, and cast action |

All models use the same schema and runtime. Preset-specific choices are data, not separate renderers. The original 12 creature models remain in the library.

## Body and rig

The coordinate system uses metres, +Y up, and +Z forward. In this system +X is the character's left side. Suffix `.L` uses +X; suffix `.R` uses -X.

There are 22 named bones:

```text
pelvis
  spine
    chest
      neck
        head
          jaw
      clavicle.L
        upperArm.L
          forearm.L
            hand.L
      clavicle.R
        upperArm.R
          forearm.R
            hand.R
  upperLeg.L
    shin.L
      foot.L
        toe.L
  upperLeg.R
    shin.R
      foot.R
        toe.R
```

`humanoidSkeleton()` returns the parent and rest position of each bone. The render adapter creates the actual Three.js `Bone` and `Skeleton` objects. The torso, neck region, and head form an implicit surface. Automatic rest-space weights connect this surface to the torso bones. A garment shell uses the same skeleton. Limb volumes, face details, armor pieces, and hands are mounted on bones.

The mesh uses four weight slots per vertex, with two active weights for torso skinning. Finger hinges are procedural child groups, not bones in the 22-bone skeleton. Limbs have visible modular joints. This foundation does not claim a seamless full-body character mesh.

### Proportion controls

The 11 controls are overall scale, torso length, shoulder width, hip width, arm length, leg length, head size, body mass, hand size, foot size, and forward posture. Validation rejects values outside the allowed ranges in `core/humanoid.js`.

A humanoid has exactly four structural body nodes: `core`, `spine`, `chest`, and `head`. These nodes derive from the rig. Call `syncHumanoidBody()` after editing proportions in code. Direct changes to structural nodes are rejected. This prevents a stale body graph from disagreeing with its limb lengths or skeleton.

Outfit choices are tunic, armor, wrap, and carapace. Head-cover choices are crop, hood, crest, and bare. Hand choices are fingers, claws, and stone. These choices change generated geometry. They are not imported assets or an equipment inventory.

## Joint sockets and monster parts

The existing 16 part families remain available. Humanoid sockets are head, chest, pelvis, upper arm, forearm, hand, upper leg, shin, and foot. The special `body` socket uses surface projection onto the structural body host.

Each part stores `socket` and `socketOffset`. Offsets are bounded local values. Mirrored parts select the opposite bone and mirror the local X offset. Click a limb while a part is armed to assign the hit bone. A click on skinned body geometry is mapped back to rest space before attachment projection.

Part factories retain the existing contract: local +Y points out from the attachment. The assembler applies the anchor, normal, twist, and shared bend once. A factory must not apply those transforms again. It receives shared materials and reusable geometries.

A creature-leg gene can exist in a humanoid blueprint, but the humanoid adapter does not build it. The gene remains available when the blueprint is mixed back into a creature. The compatibility panel lists it as inactive. The humanoid always supplies its own two legs in this release.

## Animation layers

Humanoids use four base states: idle, walk, run, and creep. The selected weights are normalized. Unsupported creature states remain in the blueprint but do not contribute to the humanoid adapter. With no supported weight, the adapter uses idle.

The base layer drives the body, opposing arm swings, and analytic two-segment leg IK. Workshop feet use a procedural stance/swing cycle. Habitat feet use held world targets and ground-height queries. Gait styles are neutral, heavy, skulking, and stiff. Tempo, stride, foot lift, and compatible secondary gains remain available.

One action layer runs over the base layer. Actions are wave, point, talk, guard, melee swing, cast, hit reaction, jump pose, sit, defeat, and celebrate. Select No action to disable this layer.

An action has weight, speed, repeat, and a mask. Auto uses the action's default mask. Upper affects the torso, arms, head, and hands while preserving leg IK. Full can also control pelvis and legs. Full-body sitting height derives from the current leg lengths and foot dimensions. It is not tied to one preset's size.

Melee swing, cast, hit, and jump are one-shot actions by default. Sit and defeat hold their final pose when repeat is off. Other actions loop by default. The Repeat control can override this. Replay restarts the selected action. Play, pause, reset, and scrub control the workshop timeline.

The visual action clock does not move the Rapier body. Jump pose is not the physical jump. Sitting and defeat do not resize the controller or create a ragdoll. These distinctions are reported in the compatibility notes.

### Facial and hand motion

The rig includes blink scaling, procedural gaze, a jaw bone, and finger curl controls. Talk uses an oscillating jaw. It does not analyze audio. Point currently uses a common hand curl control rather than per-finger authored pointing. There are no facial blendshapes or lip-sync phonemes.

### Action timing events

The runtime emits `animation-marker` events from the creature root. Markers are collected over `(previousTime, currentTime]`. Pause, reverse time, and explicit seeking do not emit events. Large time gaps use a bounded catch-up window.

| Action | Marker | Normalized time |
|---|---|---:|
| Melee swing | `attack-contact` | 0.52 |
| Cast | `cast-release` | 0.68 |
| Jump pose | `takeoff` | 0.18 |
| Jump pose | `land` | 0.82 |

An event has `name`, `time`, `action`, and `cycle`. The name `attack-contact` is an animation timing marker. It does not confirm a physical contact or apply damage. The receiving game must check range, targets, collisions, and its own combat rules.

## Actor roles and batches

The nine role profiles are civilian, guard, scout, skirmisher, brute, stalker, sentinel, caster, and monster. Each contains a faction, behavior hint, health, speed, sight range, attack range, damage, and cooldown.

These are bounded integration values. In this prototype, only speed changes habitat movement. The other values do not run behavior, navigation, health, or combat. For example, selecting Guard does not start a patrol. The UI labels the role data accordingly.

Batch generation accepts a validated source, an unsigned 32-bit seed, a count from 1 to 24, and variation from 0 to 1. It returns independent actor manifests. It never mutates the source. The same source and settings reproduce the same result.

Humanoid proportions, part dimensions, texture seed, pattern scale, tempo, and health can vary. The batch retains the chosen rig family, role, outfit choices, and part topology. It is a controlled variation tool, not a semantic prompt-to-character system. Creature batches retain the creature body graph in this release.

The editor previews one roster entry at a time. It does not render 24 actors simultaneously. Export the roster to consume it in your own spawning system.

## Five-channel mixer

| Channel | Humanoid behavior |
|---|---|
| Body | Rig family, proportions, structural nodes, outfit/head/hand choices, and role profile |
| Parts | Monster parts, sizes, presence, anchors, sockets, and socket offsets |
| Pigment | Base and accent colors |
| Surface | Pattern layers and material controls |
| Motion | Base weights, secondary gains, gait settings, humanoid action settings |

Matching humanoid proportions blend continuously. Discrete choices use source A below the midpoint and source B at or above it. A body lock freezes the complete rig, structural nodes, and role profile.

For a humanoid/creature pair, body family changes discretely. Select source A or B in the Body graph control to force a family. Other channels can still blend. The mixer does not interpolate incompatible skeletons or pretend to retarget their actions.

Part hosts are remapped to valid structural nodes. Humanoid joint sockets fall back to their body host on creature rigs. Unsupported leg genes and actions are retained with notes. A valid output can still have awkward proportions or overlapping parts. Validation is not an artistic fit or collision guarantee.

Sources are snapshots. Preview always starts from those sources, not from the last result. Apply is one undo transaction. Cancel restores the previous creature. An actor manifest can be imported as either mixer source. A saved mixer recipe includes sources, settings, locks, and frozen values.

## Exports and migration

A `.morph.json` blueprint stores schema 3 creature data. Schema 1 and 2 inputs upgrade to a creature rig with default role and humanoid-motion data.

A `.morphmix.json` recipe stores both source blueprints and the mixer state. Recipe format version remains 1. The contained blueprints are upgraded.

An `.actor.json` manifest wraps the blueprint with units, axes, rig family, socket names, action timing, and compatibility. `roleIsMetadata` is true. Geometry and animations are declared generated at runtime. Rest height is supplied for humanoids; the current creature contract uses null and the receiving runtime computes anatomy analysis.

A `.roster.json` export contains 1–24 actor manifests with unique stable IDs and batch settings. Imports validate every blueprint, reject duplicate IDs, and rebuild derived contracts. They do not trust imported capability claims.

Plain blueprint input is limited to 256 KB, actor input to 1 MB, and roster input to 8 MB. The source includes 37 validated JSON examples. The example generator is `scripts/examples.mjs`.

These exports are procedural recipes, not baked glTF meshes or animation clips. The old delivered HTML and source archives remain unchanged. Version 3 uses separate browser save keys and can read previous saved keys as a fallback.

## Integration example

This example uses the source modules after installing the pinned dependencies. Supply your own Three.js scene and render loop.

```js
import {preset, validateGenome} from './src/core/genome.js';
import {syncHumanoidBody} from './src/core/humanoid.js';
import {actorManifest, generateActorBatch} from './src/core/actors.js';
import {Creature} from './src/creature/assemble.js';
import {animateCreature} from './src/creature/animator.js';

const draft = preset('warden');
draft.rig.proportions.arms = 1.15;
syncHumanoidBody(draft);
draft.motion.weights = {
  idle: 0, walk: 1, run: 0, creep: 0,
  bound: 0, swim: 0, hover: 0, display: 0
};
draft.motion.humanoid.action = 'wave';
draft.motion.humanoid.mask = 'upper';
const blueprint = validateGenome(draft);
const creature = new Creature(blueprint);
scene.add(creature.root);

creature.root.addEventListener('animation-marker', ({marker}) => {
  // Route timing to your effects or gameplay layer. Do not assume a hit.
  console.log(marker.name, marker.action, marker.cycle);
});

let time = 0;
function update(dt) {
  if (!Number.isFinite(dt) || dt < 0) return;
  time += Math.min(dt, 0.1);
  animateCreature(creature, Math.min(dt, 0.1), {
    time, preview: true, speed: 0, grounded: true
  });
}

const actor = actorManifest(blueprint);
const roster = generateActorBatch(blueprint, {
  count: 6, seed: 8128, variation: 0.25
});
// Serialize actor or roster as JSON. Call update(dt) from your render loop.
// On removal: scene.remove(creature.root); creature.dispose();
```

## Extension points

Add a humanoid preset in `core/humanoid-presets.js` and metadata in `HUMANOID_MODELS`. Use bounded proportions and `syncHumanoidBody()`, then validate. Do not add a special render path for one preset.

Add an action to `HUMANOID_ACTIONS` and implement its pose in `sampleHumanoidAction()`. Use stable bone names. Define a mask, duration, envelope behavior, and optional timing events. Update types, tests, and the manifest contract. An action control without a pose sampler does not add animation.

Add another rig family only with a complete contract: schema validation, canonical body rules, skeleton or part layout, runtime compiler, animator, socket resolver, anatomy analysis, compatibility report, mixer family policy, migration, and tests. Do not silently reuse humanoid poses on arbitrary body graphs.

Integrate AI outside the visual rig. A game controller should consume role values, choose motion/action state, and drive the physics controller. It should own health and damage. This keeps source generation independent from one game's behavior implementation.

## Rendered release checks

Run `npm test` first. Install the exact engines, then run `npm run test:engine` and `npm run test:humanoid-engine`. These real-engine tests check runtime assembly, finite bone transforms, skinned vertex sampling, animated picking, sockets, markers, disposal, and upright physics. They are not GPU render tests.

On a WebGL2 machine, run the game and inspect all nine humanoids. Check body/garment skinning, shoulders, knees, eyes, silhouettes, and surface layers. Play every action at minimum and maximum proportions. Check both sides of mirrored hand attachments while walking and waving. Check sitting and defeat on the floor and on the habitat ramp. Visual actions do not adapt the collider.

Test a humanoid/creature mix in both body families. Check compatibility notes. Test save/load, undo, actor import, and roster selection. Enter the habitat, move, sprint, physically jump, and collect spores. Confirm there are no console or shader errors. Monitor resource use across repeated builds. Finally, build the offline HTML, disable network access, and repeat the loading and rendering checks.

Do not claim those rendered checks passed from the renderer-free editor harness alone.
