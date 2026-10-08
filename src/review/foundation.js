import { walkerPreviewTarget, solveWalker } from '../core/walker-geometry.js';
import { fingerCurl, equipmentAction } from '../core/equipment-pose.js';
import { SHARED_PARTS } from '../core/shared-parts.js';
import {
  compileTidalPart,
  sampleTidalPart,
  placeTidalPoint,
  meshNormals,
} from '../core/tidal-geometry.js';
import { deformBodyPoint, deformBodyFrame } from '../core/travel.js';
import { sampleMotion } from '../core/motion.js';
import { validateGenome, preset } from '../core/genome.js';
import { resolveNodes, analyze } from '../core/anatomy.js';
import { compileBodySurface } from '../core/mesher.js';
import {
  humanoidLayout,
  syncHumanoidBody,
  PROPORTIONS,
  humanoidSurfaceNodes,
  hostBone,
  socketBone,
  HUMANOID_LOCOMOTION,
} from '../core/humanoid.js';
import { humanoidSkeleton, humanoidSkinWeights, humanoidGarment } from '../core/rig-data.js';
import { humanoidDetailPlan, foundationPrimitive } from '../core/foundation-shapes.js';
import {
  defaultHumanoidMotion,
  sampleHumanoidAction,
  HUMANOID_ACTIONS,
  humanoidActionOffset,
} from '../core/humanoid-motion.js';
import {
  compose,
  multiply,
  transform,
  quaternion,
  slerp,
  normalTransform,
  faceNormals,
  normalize,
  cross,
  sub,
} from './math.js';
export const REVIEW_POSES = [
  'bind',
  'a-pose',
  't-pose',
  'reach',
  'twist',
  'crouch',
  'stride',
  'wave',
  'cast',
  'sit',
  'motion-cycle',
];
export const FOUNDATIONS = [
  {
    id: 'animal',
    label: 'Four-paw companion',
    preset: 'trailhound',
    family: 'creature',
    full: true,
  },
  {
    id: 'fieldworker',
    label: 'Equipped field worker',
    preset: 'lamplighter',
    family: 'humanoid',
    full: true,
  },
  {
    id: 'jointed',
    label: 'Jointed plate crawler',
    preset: 'pebbleroller',
    family: 'creature',
    full: true,
  },
  {
    id: 'bivalve',
    label: 'Hinged shell swimmer',
    preset: 'clapshell',
    family: 'creature',
    full: true,
  },
  { id: 'blossom', label: 'Petal flier', preset: 'bloomkite', family: 'creature', full: true },
  {
    id: 'basket',
    label: 'Open-cage flier',
    preset: 'basketdrifter',
    family: 'creature',
    full: true,
  },
  { id: 'comb', label: 'Ciliary swimmer', preset: 'comblantern', family: 'creature', full: true },
  {
    id: 'colony',
    label: 'Linked pump colony',
    preset: 'salpchain',
    family: 'creature',
    full: true,
  },
  { id: 'radial', label: 'Radial swimmer', preset: 'starweaver', family: 'creature', full: true },
  { id: 'hoop', label: 'Annular flier', preset: 'hoopglider', family: 'creature', full: true },
  { id: 'canopy', label: 'Bristle canopy', preset: 'sievewisp', family: 'creature', full: true },
  { id: 'helix', label: 'Helical flier', preset: 'screwdrifter', family: 'creature', full: true },
  { id: 'balanced', label: 'Balanced biped', preset: 'wayfarer', family: 'humanoid' },
  { id: 'compact', label: 'Compact biped', preset: 'goblin', family: 'humanoid' },
  { id: 'heavy', label: 'Heavy biped', preset: 'ogre', family: 'humanoid' },
  { id: 'long', label: 'Long-limbed biped', preset: 'ranger', family: 'humanoid' },
  { id: 'walker', label: 'Walker body', preset: 'mossback', family: 'creature' },
  { id: 'crawler', label: 'Crawler body', preset: 'burrower', family: 'creature' },
  {
    id: 'pelagic',
    label: 'Pelagic swimmer',
    preset: 'needleswimmer',
    family: 'creature',
    full: true,
  },
  { id: 'eel', label: 'Undulating eel', preset: 'ribbondrift', family: 'creature', full: true },
  { id: 'medusa', label: 'Pulsing medusa', preset: 'moonbell', family: 'creature', full: true },
  { id: 'soarer', label: 'Feathered soarer', preset: 'sailwing', family: 'creature', full: true },
  { id: 'fourwing', label: 'Four-wing flier', preset: 'glassdart', family: 'creature', full: true },
  {
    id: 'aerostat',
    label: 'Buoyant aerostat',
    preset: 'skymedusa',
    family: 'creature',
    full: true,
  },
];
export const SHAPE_PROFILES = {
  unchanged: { label: 'Source proportions', values: {} },
  compact: {
    label: 'Compact adventurer',
    values: { scale: 0.82, head: 1.18, legs: 0.84, arms: 0.93 },
  },
  tall: {
    label: 'Tall explorer',
    values: { scale: 1.18, head: 0.84, legs: 1.2, arms: 1.12, bulk: 0.87 },
  },
  heavy: {
    label: 'Heavy guardian',
    values: { shoulders: 1.38, bulk: 1.5, hips: 1.14, arms: 1.12, hands: 1.2 },
  },
  nimble: {
    label: 'Nimble scout',
    values: { bulk: 0.73, hips: 0.85, legs: 1.22, shoulders: 0.92 },
  },
  stylized: {
    label: 'Stylized companion',
    values: { head: 1.32, hands: 1.18, feet: 1.22, legs: 0.82, torso: 0.9 },
  },
};
export function foundationBlueprint(id) {
  const def = FOUNDATIONS.find(x => x.id === id);
  if (!def) throw new Error('Unknown foundation.');
  const g = preset(def.preset);
  g.name = def.label;
  if (!def.full) g.parts = g.parts.filter(p => p.type === 'leg');
  if (g.rig.family === 'humanoid' && !def.full) {
    g.parts = [];
    g.rig.outfit = 'wrap';
    g.rig.headStyle = 'bare';
    g.rig.handStyle = 'fingers';
    g.rig.bodyStyle = 'defined';
    syncHumanoidBody(g);
  }
  if (!def.full) {
    g.appearance.color = '#91a99e';
    g.appearance.accent = '#465b59';
  }
  return validateGenome(g);
}
/** Shape profiles derive from a fixed source, never from the last preview. */
export function deriveFoundation(source, profile = 'unchanged', amount = 1) {
  const g = validateGenome(source),
    def = SHAPE_PROFILES[profile];
  if (!def) throw new Error('Unknown shape profile.');
  if (!Number.isFinite(amount) || amount < 0 || amount > 1)
    throw new Error('Profile amount must be between zero and one.');
  if (g.rig.family !== 'humanoid' && profile !== 'unchanged')
    throw new Error(
      'These proportion profiles require a humanoid. Creature nodes remain directly editable.',
    );
  if (g.rig.family === 'humanoid') {
    for (const [key, value] of Object.entries(def.values)) {
      g.rig.proportions[key] += (value - g.rig.proportions[key]) * amount;
    }
    syncHumanoidBody(g);
  }
  return validateGenome(g);
}
function rgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function palette(g) {
  const a = g.appearance;
  return {
    membrane: rgb(a.color).map((x, i) => x * 0.84 + rgb(a.accent)[i] * 0.16),
    bone: rgb('#ece0c4'),
    cloth: rgb(a.accent),
    metal: rgb('#adb4b8'),
    glow: rgb(a.accent),
    skin: rgb(a.color),
    accent: rgb(a.accent),
    armor: rgb(a.color).map((x, i) => x * 0.78 + rgb(a.accent)[i] * 0.22),
    dark: rgb('#162c30'),
    eye: rgb('#f5edcb'),
    iris: rgb('#d2b45d'),
    pupil: rgb('#102328'),
    glint: [255, 255, 255],
  };
}
function transformed(data, m) {
  const positions = new Float32Array(data.positions.length),
    normals = new Float32Array(data.normals.length);
  for (let i = 0; i < positions.length; i += 3) {
    positions.set(transform(m, data.positions.subarray(i, i + 3)), i);
    normals.set(normalTransform(m, data.normals.subarray(i, i + 3)), i);
  }
  return { positions, normals, indices: data.indices };
}
/** Humanoid action review spans one full action; creature review spans two seconds. */
export function motionCycleTime(motion, phase, human = false) {
  const config = motion?.humanoid;
  return human && config?.action !== 'none' && HUMANOID_ACTIONS[config?.action]
    ? (phase * HUMANOID_ACTIONS[config.action].duration) / config.actionSpeed
    : phase * 2;
}
export function sampleFoundationBones(rig, pose = 'bind', phase = 0.5, motion = null) {
  if (!REVIEW_POSES.includes(pose)) throw new Error('Unknown diagnostic pose.');
  if (!Number.isFinite(phase) || phase < 0 || phase > 1)
    throw new Error('Pose phase is out of range.');
  const spec = humanoidSkeleton(rig),
    l = humanoidLayout(rig),
    rot = {},
    offset = [0, 0, 0];
  const set = (n, x = 0, y = 0, z = 0) => {
    rot[n] = quaternion([x, y, z]);
  };
  if (pose !== 'bind') set('spine', rig.proportions.posture);
  if (pose === 'a-pose')
    for (const side of [1, -1]) {
      const e = side > 0 ? '.L' : '.R';
      set('upperArm' + e, 0, 0, side * 0.3);
      set('forearm' + e, -0.1);
    }
  if (pose === 't-pose')
    for (const side of [1, -1])
      set('upperArm' + (side > 0 ? '.L' : '.R'), 0, 0, (side * Math.PI) / 2);
  if (pose === 'reach')
    for (const side of [1, -1]) {
      const e = side > 0 ? '.L' : '.R';
      set('upperArm' + e, -2.35, 0, side * 0.15);
      set('forearm' + e, -0.4);
    }
  if (pose === 'twist') {
    set('spine', rig.proportions.posture, (phase - 0.5) * 1.8, 0);
    set('chest', 0, (phase - 0.5) * 1.4, 0);
    set('head', 0, -(phase - 0.5) * 0.6, 0);
  }
  if (pose === 'crouch') {
    const a = 0.35 + phase * 0.75;
    for (const e of ['.L', '.R']) {
      set('upperLeg' + e, -a);
      set('shin' + e, a * 2);
      set('foot' + e, -a);
    }
    offset[1] = (Math.cos(a) - 1) * (l.thigh + l.shin);
    set('spine', 0.2 + rig.proportions.posture);
  }
  if (pose === 'stride') {
    const a = Math.sin(phase * Math.PI * 2) * 0.65;
    set('upperLeg.L', a);
    set('upperLeg.R', -a);
    set('shin.L', Math.max(0, -a));
    set('shin.R', Math.max(0, a));
    set('upperArm.L', -a);
    set('upperArm.R', a);
  }
  if (['wave', 'cast', 'sit'].includes(pose)) {
    const config = { ...defaultHumanoidMotion(), action: pose, repeat: false },
      action = sampleHumanoidAction(config, phase * HUMANOID_ACTIONS[pose].duration);
    for (const [name, value] of Object.entries(action.rotations))
      rot[name] = slerp([0, 0, 0, 1], quaternion(value), action.weight);
    const o = humanoidActionOffset(config, action, l);
    for (let i = 0; i < 3; i++) offset[i] = o[i] * action.weight;
  }

  if (pose === 'motion-cycle' && motion) {
    const time = motionCycleTime(motion, phase, true),
      base = sampleMotion(
        {
          ...motion,
          weights: Object.fromEntries(
            Object.entries(motion.weights).map(([k, v]) => [
              k,
              HUMANOID_LOCOMOTION.includes(k) ? v : 0,
            ]),
          ),
        },
        { preview: true },
      ),
      step = Math.sin(time * base.rate * Math.PI * 2) * Math.min(0.8, Math.abs(base.stride)),
      config = motion.humanoid,
      action = sampleHumanoidAction(config, time);
    for (const [side, end] of [
      [1, '.L'],
      [-1, '.R'],
    ]) {
      set('upperLeg' + end, step * side);
      set('shin' + end, Math.max(0, -step * side));
      set('upperArm' + end, -step * side * 0.85, 0, side * 0.1);
      set('forearm' + end, -0.12);
    }
    set('head', config.lookPitch, config.lookYaw);
    for (const [name, value] of Object.entries(action.rotations))
      rot[name] = slerp(rot[name] || [0, 0, 0, 1], quaternion(value), action.weight);
    const o = humanoidActionOffset(config, action, l);
    for (let i = 0; i < 3; i++) offset[i] = o[i] * action.weight;
    set('jaw', action.jaw * action.weight);
  }
  // The bind specimen stands on the sole. The game's locomotion IK owns its own
  // root clearance. Diagnostic poses do not claim to reproduce terrain contact.
  const groundLift = l.thigh + l.shin + l.footHeight + 0.025 * l.scale,
    root = compose([0, groundLift, 0]);
  const world = {},
    rest = {},
    restLocal = {};
  for (const d of spec) {
    const p = d.position.map((v, i) => v + (d.name === 'pelvis' ? offset[i] : 0));
    world[d.name] = multiply(d.parent ? world[d.parent] : root, compose(p, rot[d.name]));
    restLocal[d.name] = d.position.map((v, i) => v + (d.parent ? restLocal[d.parent][i] : 0));
    rest[d.name] = transform(root, restLocal[d.name]);
  }
  return { spec, world, rest, restLocal, root, rotations: rot, groundLift };
}
export class FoundationCompiler {
  constructor(raw) {
    this.genome = validateGenome(raw);
    this.palette = palette(this.genome);
    this.nodes = resolveNodes(this.genome);
    this.body = compileBodySurface(humanoidSurfaceNodes(this.genome.rig, this.nodes));
    this.analysis = analyze(this.genome);
    this.human = this.genome.rig.family === 'humanoid';
    this.tidalPlans = this.analysis.parts
      .filter(p => Object.hasOwn(SHARED_PARTS, p.type) && !(this.human && p.type === 'leg'))
      .map(p => ({ part: p, plan: compileTidalPart(p) }));
    this.extent = {
      min: Math.min(...this.nodes.map(n => n.center[2] - n.radii[2])),
      max: Math.max(...this.nodes.map(n => n.center[2] + n.radii[2])),
    };
    if (this.human) {
      this.layout = humanoidLayout(this.genome.rig);
      this.plan = humanoidDetailPlan(this.genome.rig);
      this.spec = humanoidSkeleton(this.genome.rig);
      this.skin = humanoidSkinWeights(this.body.positions, this.genome.rig);
      this.garment = humanoidGarment(this.genome.rig);
      this.garment.normals = faceNormals(this.garment.positions, this.garment.indices);
      this.clothSkin = humanoidSkinWeights(this.garment.positions, this.genome.rig);
      this.primitives = Object.fromEntries(
        ['sphere', 'cap', 'cone'].map(k => [k, foundationPrimitive(k)]),
      );
    }
  }
  sample({ pose = 'bind', phase = 0.5, garment = true, details = true } = {}) {
    if (!this.human && pose !== 'motion-cycle') {
      pose = 'bind';
      phase = 0;
    }
    if (!Number.isFinite(phase) || phase < 0 || phase > 1)
      throw new Error('Pose phase is out of range.');
    const meshes = [],
      bones = [],
      sockets = [];
    if (this.human) {
      const rig = this.genome.rig,
        matrices = sampleFoundationBones(rig, pose, phase, this.genome.motion),
        names = matrices.spec.map(d => d.name);
      const skin = (data, weights, name, material) => {
        const positions = new Float32Array(data.positions.length);
        for (let i = 0; i < data.positions.length / 3; i++) {
          const p = data.positions.subarray(i * 3, i * 3 + 3);
          for (let j = 0; j < 4; j++) {
            const w = weights.weights[i * 4 + j];
            if (!w) continue;
            const bone = names[weights.indices[i * 4 + j]],
              rest = matrices.restLocal[bone],
              v = transform(
                matrices.world[bone],
                p.map((x, k) => x - rest[k]),
              );
            for (let k = 0; k < 3; k++) positions[i * 3 + k] += v[k] * w;
          }
        }
        const normals = pose === 'bind' ? data.normals : faceNormals(positions, data.indices);
        meshes.push({
          name,
          positions,
          normals,
          indices: data.indices,
          material,
          color: this.palette[material],
          restPositions: data.positions,
          skin: weights,
          kind: 'skinned',
        });
      };
      skin(this.body, this.skin, 'Body surface', 'skin');
      if (garment)
        skin(
          this.garment,
          this.clothSkin,
          'Garment',
          ['armor', 'carapace'].includes(rig.outfit) ? 'armor' : 'accent',
        );
      const world = { ...matrices.world },
        actionSample =
          pose === 'motion-cycle'
            ? sampleHumanoidAction(
                this.genome.motion.humanoid,
                motionCycleTime(this.genome.motion, phase, true),
              )
            : null,
        fingers = new Map(this.plan.fingers.map(f => [f.id, f]));
      for (const n of this.plan.nodes) {
        const rotation = [...n.rotation],
          finger = fingers.get(n.id);
        if (actionSample && finger)
          rotation[0] = finger.base - fingerCurl(actionSample, this.analysis.parts, finger.side);
        world[n.id] = multiply(world[n.parent], compose(n.position, quaternion(rotation), n.scale));
        if (n.kind === 'mesh' && details) {
          meshes.push({
            name: n.id,
            ...transformed(this.primitives[n.geometry], world[n.id]),
            color: this.palette[n.material],
            material: n.material,
            kind: 'rigid',
          });
        }
      }

      if (details)
        for (const { part, plan } of this.tidalPlans) {
          const name =
              part.socket === 'body' ? hostBone(part.host) : socketBone(part.socket, part.side),
            bone = matrices.world[name] ? name : 'chest',
            rest = matrices.restLocal[bone],
            animTime =
              pose === 'motion-cycle'
                ? motionCycleTime(this.genome.motion, phase, true) * this.genome.motion.tempo
                : 0,
            motion = sampleMotion(this.genome.motion, { preview: true });
          if (actionSample)
            motion.action = equipmentAction(this.genome.motion.humanoid.action, actionSample);
          for (const c of sampleTidalPart(plan, animTime, motion)) {
            const points = new Float32Array(c.positions.length);
            for (let i = 0; i < points.length; i += 3) {
              const placed = placeTidalPoint(c.positions.subarray(i, i + 3), part),
                local = placed.map((v, k) => v - rest[k]);
              points.set(transform(matrices.world[bone], local), i);
            }
            meshes.push({
              ...c,
              name: part.indexKey + '/' + c.name,
              positions: points,
              normals: meshNormals(points, c.indices),
              color: this.palette[c.material] || this.palette.skin,
              pigmentPositions: c.positions,
            });
          }
        }
      for (const d of matrices.spec) {
        const point = transform(matrices.world[d.name], [0, 0, 0]);
        if (d.parent)
          bones.push({ name: d.name, a: transform(matrices.world[d.parent], [0, 0, 0]), b: point });
        sockets.push({ name: d.name, point });
      }
    } else {
      const lift = this.analysis.restHeight,
        positions = new Float32Array(this.body.positions),
        time = pose === 'motion-cycle' ? phase * 2 : 0,
        m = this.genome.motion,
        animTime = time * m.tempo,
        wave = pose === 'motion-cycle' ? m.bodyWave : { kind: 'rigid' },
        motion = sampleMotion(m, { preview: true }),
        gait = time * motion.rate,
        moving = motion.rate > 0.02;
      const torso =
        pose === 'motion-cycle'
          ? compose(
              [
                0,
                lift +
                  Math.sin(animTime * 2.1) * 0.018 * motion.layers.breath +
                  Math.cos(gait * Math.PI * 4) * motion.bob -
                  motion.tuck,
                0,
              ],
              quaternion([
                motion.pitch + Math.sin(animTime * 1.5) * 0.008 * motion.layers.breath,
                0,
                Math.sin(moving ? gait * Math.PI * 2 : animTime * 1.1) * motion.sway,
              ]),
            )
          : compose([0, lift, 0]);
      for (let i = 0; i < positions.length; i += 3)
        positions.set(
          transform(
            torso,
            deformBodyPoint(this.body.positions.subarray(i, i + 3), wave, animTime, this.extent),
          ),
          i,
        );
      meshes.push({
        name: 'Body surface',
        positions,
        normals: meshNormals(positions, this.body.indices),
        indices: this.body.indices,
        color: this.palette.skin,
        material: 'skin',
        kind: 'surface',
        restPositions: this.body.positions,
        pigmentPositions: this.body.positions,
      });
      if (details)
        for (const { part, plan } of this.tidalPlans) {
          if (part.type === 'leg') {
            const hip = transform(torso, part.position).map((v, i) => v - (i === 1 ? lift : 0)),
              afloat = this.genome.motion.travel.medium !== 'ground',
              target = walkerPreviewTarget(part, motion, {
                gait,
                restHeight: lift,
                hip,
                afloat,
                moving: pose === 'motion-cycle' && moving,
              }),
              joints = solveWalker(part, hip, target);
            for (const c of sampleTidalPart(plan, animTime, { walker: joints })) {
              const points = new Float32Array(c.positions);
              for (let i = 1; i < points.length; i += 3) points[i] += lift;
              meshes.push({
                ...c,
                name: part.indexKey + '/' + c.name,
                positions: points,
                color: this.palette[c.material] || this.palette.skin,
                pigmentPositions: c.positions,
              });
            }
            continue;
          }
          const frame = deformBodyFrame(part.position, part.normal, wave, animTime, this.extent),
            placed = { ...part, ...frame };
          for (const c of sampleTidalPart(plan, animTime, motion)) {
            const points = new Float32Array(c.positions.length);
            for (let i = 0; i < points.length; i += 3)
              points.set(
                transform(torso, placeTidalPoint(c.positions.subarray(i, i + 3), placed)),
                i,
              );
            meshes.push({
              ...c,
              name: part.indexKey + '/' + c.name,
              positions: points,
              normals: meshNormals(points, c.indices),
              color: this.palette[c.material] || this.palette.skin,
              pigmentPositions: c.positions,
            });
          }
        }
      for (const n of this.nodes)
        sockets.push({
          name: n.id,
          point: transform(torso, deformBodyPoint(n.center, wave, animTime, this.extent)),
        });
    }
    const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const m of meshes)
      for (let i = 0; i < m.positions.length; i++)
        if (Number.isFinite(m.positions[i])) {
          const k = i % 3;
          bounds.min[k] = Math.min(bounds.min[k], m.positions[i]);
          bounds.max[k] = Math.max(bounds.max[k], m.positions[i]);
        }
    return {
      meshes,
      bones,
      sockets,
      bounds,
      pose,
      phase,
      sampleTimeSeconds:
        pose === 'motion-cycle' ? motionCycleTime(this.genome.motion, phase, this.human) : null,
      blueprint: this.genome,
      coverage: this.human
        ? `Shared humanoid foundation and ${details ? this.tidalPlans.length : 0} joint-mounted shared parts. All active attachment families use shared geometry. Motion-cycle is a diagnostic action sample, not terrain IK.`
        : `Shared body surface and ${details ? this.tidalPlans.length : 0} emitted shared procedural parts. All active attachment families use shared geometry. Body and part waves use the runtime formulas.`,
      inactiveGenes: this.genome.parts
        .filter(p => (p.presence ?? 1) <= 0.005 || (this.human && p.type === 'leg'))
        .map(p => ({
          id: p.id,
          type: p.type,
          reason:
            p.type === 'leg' && this.human
              ? 'Humanoid rig supplies its own legs'
              : 'Presence is zero',
        })),
      excludedGenes: this.genome.parts.filter(p => !details || !Object.hasOwn(SHARED_PARTS, p.type))
        .length,
      backend: 'foundation-cpu',
      generator: 'foundation-plan-3',
      boneCount: this.spec?.length || 0,
    };
  }
}
