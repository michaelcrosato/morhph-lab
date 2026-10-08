# Humanoids and actors

Morph Lab has two rig families: **creature** (a free body graph) and **humanoid** (a fixed biped rig). Both share blueprints, materials, part families, the mixer, undo/redo and export. Each has its own animation adapter.

The library has 27 humanoid models; see [content-catalog.md](content-catalog.md). The editor produces reusable actor recipes. It does not implement NPC AI, navigation or combat.

## Rig

Units are metres, +Y up, +Z forward. +X is the character's left: suffix `.L` uses +X and `.R` uses −X.

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

`humanoidSkeleton(rig)` in `src/core/rig-data.js` returns each bone's parent and rest position; the render adapter builds the Three.js `Bone` and `Skeleton`. The torso, neck region and head form one implicit surface skinned to the torso bones with automatic rest-space weights (four weight slots per vertex, two active). A garment shell uses the same skeleton. Limb volumes, face details, armor pieces and hands are mounted on bones. Finger hinges are procedural child groups, not skeleton bones. Limbs have visible modular joints; this is not a seamless full-body mesh.

### Body and proportions

A humanoid has exactly four structural body nodes: `core`, `spine`, `chest` and `head`. They are derived from the rig, and direct edits to them are rejected. After changing proportions in code, call `syncHumanoidBody()` so the body graph, limb lengths and skeleton agree.

| Proportion | Range |
|---|---|
| Overall scale | 0.7–1.45 |
| Torso length | 0.8–1.3 |
| Shoulder width | 0.7–1.55 |
| Hip width | 0.7–1.4 |
| Arm length | 0.7–1.4 |
| Leg length | 0.75–1.35 |
| Head size | 0.75–1.35 |
| Body mass | 0.65–1.65 |
| Hand size | 0.65–1.5 |
| Foot size | 0.7–1.45 |
| Forward posture | 0–0.45 |

Generated style choices (not imported assets or inventory):

- Outfit: tunic, armor, wrap, carapace.
- Head cover: crop, hood, crest, bare.
- Hands: fingers, claws, stone.
- Body construction: defined or classic; see [inspector.md](inspector.md#body-construction). Switch it with **Actor → Body construction** (one undo step).

## Sockets and parts

Any part family can attach to a humanoid. Each part stores `socket` and `socketOffset`:

| Socket | Bone |
|---|---|
| `head`, `chest`, `pelvis` | Centre bones |
| `upperArm`, `forearm`, `hand` | Arm bones, per side |
| `upperLeg`, `shin`, `foot` | Leg bones, per side |
| `body` | Surface projection onto the structural body host |

Offsets are bounded local values. A mirrored part uses the opposite-side bone and mirrors the local X offset. With a part armed in the Workshop, click a limb to assign the hit bone. A click on skinned body geometry is mapped back to rest space before projection.

Equipment defaults: blades and staffs go to the right hand, shields to the forearm, shoulder plates to the upper arm; other families use the body host.

An original walker `leg` gene can exist in a humanoid blueprint, but the humanoid adapter does not build it; the rig always supplies its own two legs. The gene is listed as inactive and comes back if the blueprint is mixed into a creature.

## Animation

### Locomotion

Humanoids support eight locomotion recipes: idle, walk, run, creep, backpedal, side step, prowl and trot. Their weights are normalized. Other creature recipes stay in the blueprint but are inactive on a humanoid and are reported as incompatible; with no supported weight the adapter uses idle.

The base layer drives the body, opposing arm swing and analytic two-segment leg IK. In the editor, feet follow a procedural stance/swing cycle; in the habitat they use held world targets and ground-height queries. Gait styles are neutral, heavy, skulking, stiff, proud, nimble and limping. Tempo, stride, foot lift and compatible secondary gains also apply. No root-motion track is produced; side step and backpedal do not make the habitat controller strafe.

### Action layer

One action runs over locomotion. It has a weight (0–1), speed (0.25–2), repeat and mask. **Auto** uses the action's default mask; **Upper** affects torso, arms, head and hands and keeps leg IK; **Full** can also drive pelvis and legs. **Replay** restarts the action; Play, Pause, Reset and the scrubber control the timeline. Zero weight removes the action's contribution.

| Action | Default mask | Default repeat | Timing markers (normalized time) |
|---|---|---|---|
| Wave, Point, Talk, Guard, Celebrate | upper | loop | — |
| Melee swing | upper | once | `attack-contact` 0.52 |
| Cast | upper | once | `cast-release` 0.68 |
| Hit reaction | full | once | — |
| Jump pose | full | once | `takeoff` 0.18, `land` 0.82 |
| Sit, Defeat, Kneel | full | once, holds final pose | — |
| Bow, Salute | upper | once | — |
| Pray, Inspect hand, Carry, Beckon, Shiver, Write note, Inspect with lamp, Rest hands on hips | upper | loop | — |
| Reach / use | upper | once | `interact-contact` 0.55 |
| Push | upper | loop | `push-contact` 0.55 |
| Work strike | upper | loop | `work-contact` 0.56 |
| Thrust | upper | once | `attack-contact` 0.5 |
| Kick | full | once | `attack-contact` 0.5 |
| Dodge pose | full | once | `dodge-peak` 0.3 |
| Roar | upper | once | `voice-cue` 0.42 |
| Stretch | full | loop | — |
| Lift overhead | upper | once | `grip-cue` 0.32, `lift-peak` 0.72 |
| Sweep tool | upper | loop | `sweep-contact` 0.55 |
| Read book | upper | loop | `page-cue` 0.6 |
| Draw bow | upper | loop | `release-cue` 0.76 |
| Offer item | upper | once | `offer-cue` 0.58 |

Full-body sit and kneel heights derive from the current leg and foot dimensions, not one preset's size. Knee and foot contact is not guaranteed on arbitrary terrain.

Visual actions never move the Rapier body. Jump pose is not the physical jump, and sit, kneel and defeat do not resize the collider or create a ragdoll. Carry and push are poses; they do not detect or move objects. Roar adds no sound. The banner and mantle wave on fixed roots, not collision-aware cloth, so body intersections are possible.

### Timing markers

The runtime dispatches `animation-marker` events from the creature root. Markers are collected over `(previousTime, currentTime]`. Pause, reverse time and explicit seeking emit nothing, and long frame gaps use a bounded catch-up window. Each event has `name`, `time`, `action` and `cycle`.

A marker is an animation timing cue. `attack-contact` does not confirm a hit, and `release-cue` fires no projectile. The receiving game must check range, targets, collisions and its own rules.

### Face, hands and held equipment

The rig has blink scaling, procedural gaze, a jaw bone and finger curl. Talk oscillates the jaw without audio analysis. Point uses a common hand curl, not per-finger posing. There are no facial blendshapes or lip-sync phonemes.

Held props give hand-curl hints, and a hand holding a blade or staff gets a minimum finger curl. The bow deformation and the drawing arm share one normalized pull envelope. Limits:

- No two-hand constraint, automatic grip fitting, item transfer, hand-to-page contact or gravity on held objects. A free hand can sit near a tool without touching it.
- Equipment has no collider, inventory slot, damage rule or drop behaviour.
- Tools do not dig or harvest, the lamp is emissive geometry rather than a light, and the quiver is a shape, not a container.
- Bind pose is the rig rest pose, not an equipment-constrained pose. Check equipment fit after large proportion edits.

## Actor roles

There are nine role profiles: civilian, guard, scout, skirmisher, brute, stalker, sentinel, caster and monster. Each holds a faction, behaviour hint, health, speed, sight range, attack range, damage and cooldown. These are integration values: only speed changes habitat movement. Selecting Guard does not start a patrol.

## Batches and rosters

Batch generation (**Actor → Generate roster**) takes a validated source, an unsigned 32-bit seed, a count from 1 to 24 and a variation from 0 to 1. It returns independent actor manifests and never mutates the source; the same inputs give the same roster.

Proportions, part dimensions, texture seed, pattern scale, tempo and health vary. The rig family, role, outfit choices and part topology stay fixed; creature batches keep the body graph. The editor previews one roster entry at a time. Export the roster for your own spawning system.

## Mixing

The five-channel mixer handles humanoids, including humanoid/creature pairs. See [mixer.md](mixer.md) for channel behaviour, family switching and socket fallback.

## Files

| File | Contents | Limit |
|---|---|---|
| `.morph.json` | One schema-6 blueprint. Schemas 1–5 upgrade on import; older creatures get default role and humanoid-motion data. | 256 KB |
| `.actor.json` | The blueprint plus units, axes, rig family, socket names, action timing and compatibility. `roleIsMetadata` is true; geometry and animation are generated at runtime. Rest height is given for humanoids and null for creatures. | 1 MB |
| `.roster.json` | 1–24 actor manifests with unique stable IDs and batch settings | 8 MB |

Imports validate every blueprint, reject duplicate IDs and rebuild derived contracts; imported capability claims are not trusted. These files are procedural recipes, not baked meshes or clips. For baked GLB output see [export.md](export.md).

## Integration example

This uses the source modules with the pinned engines installed. Supply your own Three.js scene and render loop.

```js
import {preset, validateGenome} from './src/core/genome.js';
import {syncHumanoidBody} from './src/core/humanoid.js';
import {actorManifest, generateActorBatch} from './src/core/actors.js';
import {Creature} from './src/creature/assemble.js';
import {animateCreature} from './src/creature/animator.js';

const draft = preset('warden');
draft.rig.proportions.arms = 1.15;
syncHumanoidBody(draft);
draft.motion.humanoid.action = 'wave';
draft.motion.humanoid.mask = 'upper';
const blueprint = validateGenome(draft);
const creature = new Creature(blueprint);
scene.add(creature.root);

creature.root.addEventListener('animation-marker', ({marker}) => {
  // Route timing to effects or gameplay. Do not assume a hit.
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
const roster = generateActorBatch(blueprint, {count: 6, seed: 8128, variation: 0.25});
// On removal: scene.remove(creature.root); creature.dispose();
```

Keep AI outside the visual rig: a game controller should read role values, choose the motion and action state, drive the physics controller, and own health and damage.

## Before using a humanoid in a game

On a WebGL2 machine, check body and garment skinning, shoulders, knees, eyes and silhouettes. Play each action at minimum and maximum proportions, check both sides of mirrored hand attachments while walking, and check sit, kneel and defeat on flat ground and on the habitat ramp. Test a humanoid/creature mix in both families, then save, reload and import actors and rosters.
