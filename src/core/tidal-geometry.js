import { CLASSIC_PARTS } from './classic-catalog.js';
import {
  buildClassicPart,
  prepareClassicMotion,
  animateClassicVertex,
} from './classic-geometry.js';
import { compileWalker, sampleWalker } from './walker-geometry.js';
import { FIELD_PARTS } from './field-catalog.js';
import { EXPANSION_PARTS } from './expansion-catalog.js';
import { buildFieldPart, prepareFieldMotion, animateFieldVertex } from './field-geometry.js';
import { buildLegacySharedPart, animateLegacyVertex } from './legacy-shared-geometry.js';
import { BLOOM_PARTS } from './bloom-catalog.js';
import { buildBloomPart, animateBloomVertex, prepareBloomMotion } from './bloom-geometry.js';
import { SHARED_PARTS } from './shared-parts.js';
import { TAU, clamp, add, sub, mul, cross, unit } from './math.js';
import {
  meshNormals,
  grid,
  sphere,
  tube,
  rod,
  foil,
  translated,
  rotated,
  rotate,
  merge,
} from './parametric-mesh.js';
import { buildFrontierPart, animateFrontierVertex } from './frontier-geometry.js';
export { meshNormals } from './parametric-mesh.js';
/** Shared source geometry for the software inspector and Three.js.
 * The plan is immutable. sampleTidalPart writes into separate frame buffers. */
export function compileTidalPart(part) {
  if (!Object.hasOwn(SHARED_PARTS, part.type))
    throw new Error('No Tide & Sky factory for ' + part.type);
  const p = {
      variant: 0,
      size: 1,
      length: 1,
      side: 1,
      phase: 0,
      flex: 1,
      bend: 0,
      material: 'inherit',
      ...part,
    },
    v = p.variant,
    batches = new Map();
  if (!Number.isInteger(v) || v < 0 || v > 2) throw new Error('Part variant must be 0, 1, or 2.');
  if (p.type === 'leg') return compileWalker(p);
  function addMesh(data, material = 'skin', behavior = 'none', detail = false) {
    const effective = p.material !== 'inherit' && !detail ? p.material : material,
      key = effective + '|' + (typeof behavior === 'object' ? JSON.stringify(behavior) : behavior);
    let list = batches.get(key);
    if (!list) {
      list = [];
      batches.set(key, list);
    }
    list.push(data);
  }
  switch (p.type) {
    default:
      (Object.hasOwn(CLASSIC_PARTS, p.type)
        ? buildClassicPart
        : Object.hasOwn(FIELD_PARTS, p.type)
          ? buildFieldPart
          : Object.hasOwn(EXPANSION_PARTS, p.type)
            ? buildLegacySharedPart
            : Object.hasOwn(BLOOM_PARTS, p.type)
              ? buildBloomPart
              : buildFrontierPart)(p, addMesh);
      break;
    case 'caudal': {
      addMesh(
        tube(
          t => [0, t * 0.55, 0],
          t => 0.15 * (1 - t) + 0.025,
          14,
          10,
        ),
      );
      const tail = grid(16, 24, (t, u) => {
        const z = (u - 0.5) * 2,
          notch =
            v === 0
              ? 0.56 * Math.pow(1 - Math.abs(z), 1.5)
              : v === 1
                ? 0.78 * Math.pow(1 - Math.abs(z), 0.65)
                : -0.18 * Math.sqrt(Math.max(0, 1 - z * z)),
          end = 1.32 - notch;
        return [
          0.026 * Math.sin(t * Math.PI),
          0.25 + t * end,
          z * (0.12 + t * (v === 1 ? 0.95 : 0.72)),
        ];
      });
      addMesh(tail, 'membrane', 'tail');
      for (let i = 0; i < 9; i++) {
        const z = (i / 8 - 0.5) * 2,
          notch =
            v === 0
              ? 0.56 * Math.pow(1 - Math.abs(z), 1.5)
              : v === 1
                ? 0.78 * Math.pow(1 - Math.abs(z), 0.65)
                : -0.18 * Math.sqrt(Math.max(0, 1 - z * z));
        addMesh(
          rod([0, 0.25, 0], [0, 1.57 - notch, z * (v === 1 ? 1.07 : 0.84)], 0.012),
          'accent',
          'tail',
        );
      }
      break;
    }
    case 'paddle': {
      addMesh(sphere([0, 0.15, 0], [0.16, 0.25, 0.18]), 'skin', 'row');
      addMesh(foil(v === 1 ? 1.08 : 1.38, v === 2 ? 0.52 : 0.38, v), 'membrane', 'row');
      for (let k = -2; k <= 2; k++)
        addMesh(
          tube(
            t => [0.013, 0.12 + t * 1.02, k * 0.14 * Math.sin(t * Math.PI * 0.82)],
            t => 0.035 * (1 - t) + 0.006,
            14,
            6,
          ),
          'accent',
          'row',
        );
      break;
    }
    case 'bell': {
      const curve = (t, a) => {
        const rad = Math.sin((t * Math.PI) / 2) * (1 + (v === 1 ? 0.11 : 0) * Math.cos(a * 8)),
          height = (v === 2 ? 1.3 : 0.82) * Math.cos((t * Math.PI) / 2);
        return [Math.cos(a) * rad, height - 0.1, Math.sin(a) * rad];
      };
      addMesh(
        grid(20, 48, (t, u) => curve(t, u * TAU)),
        'membrane',
        'bell',
      );
      // A separate inner wall leaves an actual opening below the rim.
      addMesh(
        grid(18, 48, (t, u) => {
          const q = curve(t, u * TAU);
          return [q[0] * 0.94, q[1] - 0.045, q[2] * 0.94];
        }),
        'accent',
        'bell',
      );
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        addMesh(
          tube(
            t => curve(t, a),
            () => 0.013,
            24,
            6,
          ),
          'glow',
          'bell',
        );
      }
      addMesh(
        tube(
          t => curve(1, t * TAU),
          () => 0.035,
          48,
          8,
        ),
        'accent',
        'bell',
      );
      break;
    }
    case 'coil': {
      const turns = v === 1 ? 2.9 : 2.35,
        path = t => {
          const a = (t * turns - 0.35) * TAU,
            r = 0.065 + Math.pow(t, 1.5) * 0.82;
          return [Math.cos(a) * r, 0.63 + Math.sin(a) * r, v === 2 ? t * 0.75 : 0];
        },
        radius = t => 0.035 + Math.pow(t, 1.8) * (v === 1 ? 0.2 : 0.31);
      addMesh(tube(path, radius, 120, 14), 'armor');
      for (let j = 12; j < 47; j++) {
        const t = j / 47,
          a = path(t),
          d = unit(sub(path(Math.min(1, t + 0.001)), path(t - 0.001))),
          u = unit(cross(d, [0, 0, 1])),
          w = unit(cross(d, u));
        addMesh(
          tube(
            s =>
              a.map(
                (n, i) =>
                  n + radius(t) * 1.015 * (u[i] * Math.cos(s * TAU) + w[i] * Math.sin(s * TAU)),
              ),
            () => 0.009,
            14,
            5,
          ),
          'accent',
        );
      }
      const tip = path(1);
      addMesh(sphere(tip, [0.2, 0.2, 0.24]), 'dark', 'none', true);
      break;
    }
    case 'ribbon': {
      const span = v === 2 ? 2.1 : 2.7;
      addMesh(
        grid(36, 8, (t, u) => [
          0.015 * Math.sin(u * Math.PI),
          t * span,
          (u - 0.5) *
            (0.22 + 0.55 * Math.pow(Math.sin(t * Math.PI), 0.6)) *
            (v === 2 ? 0.65 + 0.35 * Math.cos(t * TAU * 8) : 1),
        ]),
        'membrane',
        'ribbon',
      );
      addMesh(
        tube(
          t => [0, t * span, 0],
          t => 0.035 * (1 - t) + 0.005,
          36,
          6,
        ),
        'accent',
        'ribbon',
      );
      if (v === 1)
        for (const side of [-1, 1])
          addMesh(
            tube(
              t => [0, span + t * 0.55, side * t * 0.33],
              t => 0.03 * (1 - t) + 0.002,
              18,
              6,
            ),
            'accent',
            'ribbon',
          );
      break;
    }
    case 'rayfoil': {
      const span = v === 1 ? 1.6 : 2.05;
      addMesh(
        grid(24, 18, (t, u) => {
          const width = (v === 1 ? 1.02 : 1.15) * Math.pow(1 - t, 0.6) + 0.05,
            sweep = t * t * 0.68;
          return [
            0.075 * Math.sin(t * Math.PI) * Math.sin(u * Math.PI),
            t * span,
            (u - 0.5) * 2 * width - sweep,
          ];
        }),
        'skin',
        'foil',
      );
      for (let k = 0; k < 8; k++)
        addMesh(
          tube(
            t => [
              0.055 * Math.sin(t * Math.PI),
              t * span,
              (k / 7 - 0.5) * 2 * (1.1 * Math.pow(1 - t, 0.6) + 0.05) - t * t * 0.68,
            ],
            () => 0.01,
            24,
            5,
          ),
          'accent',
          'foil',
        );
      break;
    }
    case 'featherwing': {
      const span = v === 0 ? 2.7 : v === 1 ? 2.05 : 1.8;
      addMesh(
        tube(
          t => [0, t * span, -0.18 * t * t],
          t => 0.13 * (1 - t) + 0.026,
          28,
          10,
        ),
        'skin',
        'wing',
      );
      const count = v === 0 ? 16 : 13;
      for (let i = 0; i < count; i++) {
        const f = i / (count - 1),
          y = 0.12 + f * span * 0.9,
          len = (v === 0 ? 0.64 : 0.84) * (1 - 0.3 * f) + 0.1,
          w = 0.12 + (1 - f) * 0.08,
          z = -0.08 - f * f * 0.18;
        const feather = grid(12, 6, (t, u) => [
          0.025 + Math.sin(t * Math.PI) * 0.045,
          y + t * (0.22 + f * 0.38),
          z - t * len + (u - 0.5) * 2 * w * Math.pow(Math.sin(t * Math.PI), 0.55),
        ]);
        addMesh(feather, i % 3 ? 'membrane' : 'accent', 'wing');
        addMesh(rod([0.035, y, z], [0.035, y + 0.22 + f * 0.38, z - len], 0.009), 'bone', 'wing');
      }
      for (let i = 0; i < 9; i++)
        addMesh(translated(foil(0.52, 0.12), [0.02, 0.15 + (i * span) / 11, 0.1]), 'skin', 'wing');
      break;
    }
    case 'insectwing': {
      const span = v === 0 ? 2.25 : v === 1 ? 1.68 : 1.95,
        chord = v === 0 ? 0.28 : v === 1 ? 0.91 : 0.58;
      addMesh(
        grid(22, 18, (t, u) => {
          const w = chord * Math.pow(Math.sin(t * Math.PI), v === 1 ? 0.38 : 0.7),
            scallop = v === 1 ? 1 + 0.055 * Math.cos(u * TAU * 7) : 1;
          return [
            0.022 * Math.sin(t * Math.PI) * Math.sin(u * Math.PI),
            t * span,
            (u - 0.5) * 2 * w * scallop - 0.12 * t,
          ];
        }),
        'membrane',
        'wing',
      );
      for (let k = 0; k < 9; k++) {
        const z = (k / 8 - 0.5) * 2;
        addMesh(
          tube(
            t => [
              0.03,
              t * span,
              z * chord * Math.pow(Math.sin(t * Math.PI), v === 1 ? 0.38 : 0.7) - 0.12 * t,
            ],
            () => 0.0085,
            28,
            5,
          ),
          'accent',
          'wing',
        );
      }
      for (let k = 2; k < 9; k++)
        addMesh(
          tube(
            u => {
              const t = k / 10;
              return [
                0.032,
                t * span,
                (u - 0.5) * 2 * chord * Math.pow(Math.sin(t * Math.PI), v === 1 ? 0.38 : 0.7) -
                  0.12 * t,
              ];
            },
            () => 0.006,
            10,
            5,
          ),
          'accent',
          'wing',
        );
      if (v === 1)
        for (const z of [-0.42, 0.42]) {
          addMesh(sphere([0.028, 0.92, z], [0.045, 0.25, 0.2]), 'dark', 'wing', true);
          addMesh(sphere([0.075, 0.92, z], [0.026, 0.13, 0.11]), 'glow', 'wing', true);
        }
      break;
    }
    case 'tailfan': {
      const count = v === 2 ? 4 : 9;
      for (let i = 0; i < count; i++) {
        const z = (i / (count - 1) - 0.5) * 2,
          a = z * (v === 1 ? 0.6 : 0.32),
          len =
            v === 2 ? (Math.abs(z) > 0.5 ? 2.0 : 1.25) : v === 0 ? 1.0 + Math.abs(z) * 0.45 : 1.2;
        let feather = foil(len, v === 2 ? 0.1 : 0.17);
        feather = rotated(feather, 'x', a);
        addMesh(feather, i % 2 ? 'accent' : 'membrane', 'tail');
        addMesh(rotated(rod([0, 0, 0], [0, len, 0], 0.012), 'x', a), 'bone', 'tail');
      }
      break;
    }
    case 'rotor': {
      const count = [3, 2, 5][v];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU,
          leaf = grid(18, 10, (t, u) => {
            const r = 0.18 + t * 1.65,
              angle = a + t * 0.4,
              w = 0.48 * Math.sin(t * Math.PI) * (u - 0.5);
            return [
              Math.cos(angle) * r - Math.sin(angle) * w,
              0.22 + t * 0.14 + Math.sin(u * Math.PI) * 0.06,
              Math.sin(angle) * r + Math.cos(angle) * w,
            ];
          });
        addMesh(leaf, 'membrane', 'spin');
        addMesh(
          tube(
            t => {
              const a2 = a + t * 0.4,
                r = 0.18 + t * 1.65;
              return [Math.cos(a2) * r, 0.24 + t * 0.14, Math.sin(a2) * r];
            },
            () => 0.018,
            20,
            6,
          ),
          'accent',
          'spin',
        );
      }
      addMesh(sphere([0, 0.15, 0], [0.22, 0.23, 0.22]), 'armor', 'spin');
      break;
    }
    case 'elytra': {
      for (const side of [-1, 1]) {
        const motion = side < 0 ? 'caseL' : 'caseR';
        addMesh(
          grid(16, 20, (t, u) => {
            const z = (t - 0.5) * 2 * 1.12,
              w = Math.sin(t * Math.PI) * 0.67,
              theta = (u * Math.PI) / 2;
            return [
              side * (0.025 + w * Math.sin(theta)),
              0.46 * Math.sin(t * Math.PI) * Math.cos(theta),
              z,
            ];
          }),
          'armor',
          motion,
        );
        for (let k = 1; k < 6; k++)
          addMesh(
            tube(
              t => {
                const a = ((k / 6) * Math.PI) / 2;
                return [
                  side * (0.025 + Math.sin(t * Math.PI) * 0.68 * Math.sin(a)),
                  0.47 * Math.sin(t * Math.PI) * Math.cos(a),
                  (t - 0.5) * 2.24,
                ];
              },
              () => (v === 1 ? 0.025 : 0.012),
              24,
              6,
            ),
            'accent',
            motion,
          );
      }
      break;
    }
    case 'floatsac': {
      if (v === 2) {
        for (const z of [-0.43, 0, 0.43])
          addMesh(sphere([0, 0.55, z], [0.45, 0.85, 0.43], 18, 24), 'skin', 'sac');
      } else
        addMesh(
          sphere([0, 0.62, 0], [v === 0 ? 0.74 : 0.92, 0.83, v === 0 ? 1.35 : 0.92], 20, 32),
          'skin',
          'sac',
        );
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        addMesh(
          tube(
            t => {
              const f = 0.1 + t * (Math.PI - 0.2);
              return [
                Math.sin(f) * Math.cos(a) * (v === 0 ? 0.75 : 0.93),
                0.62 + Math.cos(f) * 0.845,
                Math.sin(f) * Math.sin(a) * (v === 0 ? 1.36 : 0.93),
              ];
            },
            () => 0.013,
            32,
            6,
          ),
          'glow',
          'sac',
        );
      }
      break;
    }
    case 'optic': {
      addMesh(sphere([0, 0.065, 0], [0.25, 0.14, 0.24]), 'skin');
      if (v === 2) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU;
          addMesh(
            sphere([Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1], [0.078, 0.075, 0.078], 6, 10),
            'iris',
            'blink',
            true,
          );
        }
      } else {
        addMesh(sphere([0, 0.13, 0], [0.2, 0.13, 0.19]), 'eye', 'blink', true);
        addMesh(sphere([0, 0.232, 0], [0.125, 0.031, 0.122]), 'iris', 'blink', true);
        addMesh(
          sphere([0, 0.263, 0], [v === 1 ? 0.033 : 0.066, 0.018, 0.088]),
          'pupil',
          'blink',
          true,
        );
        addMesh(sphere([-0.034, 0.28, 0.038], [0.028, 0.012, 0.028], 6, 8), 'glint', 'blink', true);
      }
      break;
    }
    case 'siphon': {
      const len = v === 1 ? 0.85 : 0.48,
        base = v === 2 ? 0.28 : 0.17,
        tip = v === 2 ? 0.38 : v === 1 ? 0.09 : 0.27;
      addMesh(
        grid(20, 28, (t, u) => {
          const r = base + (tip - base) * t;
          return [Math.cos(u * TAU) * r, t * len, Math.sin(u * TAU) * r * (v === 2 ? 0.62 : 1)];
        }),
        'skin',
        'port',
      );
      addMesh(
        tube(
          t => [Math.cos(t * TAU) * tip, len, Math.sin(t * TAU) * tip * (v === 2 ? 0.62 : 1)],
          () => 0.045,
          32,
          8,
        ),
        'accent',
        'port',
      );
      addMesh(
        sphere([0, len - 0.035, 0], [tip * 0.9, 0.014, tip * (v === 2 ? 0.53 : 0.9)]),
        'dark',
        'port',
        true,
      );
      if (v === 2)
        for (let k = -3; k <= 3; k++)
          addMesh(
            rod([k * 0.075, len + 0.015, -0.14], [k * 0.075, len + 0.015, 0.14], 0.012),
            'bone',
            'port',
          );
      break;
    }
    case 'oralarm': {
      const count = [6, 8, 10][v];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU,
          len = v === 0 ? 2.1 : v === 1 ? 1.5 : 1.0,
          r = v === 0 ? 0.025 : v === 1 ? 0.065 : 0.032,
          curve = t => {
            const s = 0.14 + t * 0.32 + Math.sin(t * 4 + i) * t * t * 0.13;
            return [Math.cos(a) * s, t * len, Math.sin(a) * s];
          };
        addMesh(
          tube(curve, t => r * (1 - t * 0.9) + 0.003, 32, 7),
          i % 3 ? 'membrane' : 'accent',
          'arms',
        );
        if (v === 1)
          for (let k = 1; k < 7; k++) {
            const q = curve(k / 7);
            addMesh(sphere(q, [0.047, 0.027, 0.047], 5, 6), 'glow', 'arms');
          }
      }
      break;
    }
  }
  const components = [];
  for (const [key, list] of batches) {
    const [material, rawBehavior] = key.split('|'),
      behavior = rawBehavior.startsWith('{') ? JSON.parse(rawBehavior) : rawBehavior,
      g = merge(list);
    for (let i = 0; i < g.positions.length; i += 3) {
      g.positions[i] *= p.size * (p.mirrorSide ?? 1);
      g.positions[i + 1] *= p.size * p.length;
      g.positions[i + 2] *= p.size;
    }
    if (p.mirrorSide === -1)
      for (let i = 0; i < g.indices.length; i += 3)
        [g.indices[i + 1], g.indices[i + 2]] = [g.indices[i + 2], g.indices[i + 1]];
    g.normals = meshNormals(g.positions, g.indices);
    components.push({ name: p.type + '/' + key, material, behavior, ...g });
  }
  // New segmented motion is batched by material, not by hinge. Each vertex range
  // retains its own descriptor. This avoids a draw call for each comb or oar.
  if (components.some(c => typeof c.behavior === 'object')) {
    const grouped = new Map();
    for (const c of components) {
      if (!grouped.has(c.material)) grouped.set(c.material, []);
      grouped.get(c.material).push(c);
    }
    const packed = [];
    for (const [material, list] of grouped) {
      const g = merge(list),
        segments = [];
      let start = 0;
      for (const c of list) {
        segments.push({ start, count: c.positions.length, behavior: c.behavior });
        start += c.positions.length;
      }
      packed.push({
        ...g,
        normals: meshNormals(g.positions, g.indices),
        name: p.type + '/' + material,
        material,
        behavior: 'segments',
        segments,
      });
    }
    return { type: p.type, part: p, components: packed, version: 2 };
  }
  return { type: p.type, part: p, components, version: 1 };
}
/** Output buffers may be reused by a runtime. A sample does not change its plan. */
export function sampleTidalPart(plan, time, pose = {}, reuse = null) {
  if (!Number.isFinite(time)) throw new Error('Animation time must be finite.');
  if (plan.kind === 'walker') return sampleWalker(plan, pose.walker, reuse);
  const p = plan.part,
    flex = p.flex * (pose.layers?.flex ?? 1),
    phase = time * (pose.wingRate || 1) * TAU + p.phase * TAU,
    mirror = p.mirrorSide ?? 1,
    side = (p.side || 1) * mirror;
  return plan.components.map((c, index) => {
    const prev = reuse?.[index],
      positions =
        prev?.positions?.length === c.positions.length
          ? prev.positions
          : new Float32Array(c.positions.length),
      normals =
        prev?.normals?.length === c.positions.length
          ? prev.normals
          : new Float32Array(c.positions.length),
      s = Math.max(0.01, p.size),
      length = Math.max(0.01, s * p.length);
    let segmentIndex = 0;
    const prepared = new Map();
    for (let i = 0; i < positions.length; i += 3) {
      if (c.segments)
        while (
          segmentIndex < c.segments.length - 1 &&
          i >= c.segments[segmentIndex].start + c.segments[segmentIndex].count
        )
          segmentIndex++;
      const behavior = c.segments ? c.segments[segmentIndex].behavior : c.behavior;
      let x = c.positions[i] * mirror,
        y = c.positions[i + 1],
        z = c.positions[i + 2],
        q;
      const span = y / length;
      if (typeof behavior === 'object') {
        if (behavior.pack === 'classic') {
          if (!prepared.has(behavior))
            prepared.set(behavior, prepareClassicMotion(behavior, p, time, pose));
          [x, y, z] = animateClassicVertex(
            behavior,
            [x, y, z],
            p,
            time,
            pose,
            prepared.get(behavior),
          );
        } else if (behavior.pack === 'field') {
          if (!prepared.has(behavior))
            prepared.set(behavior, prepareFieldMotion(behavior, p, time, pose));
          [x, y, z] = animateFieldVertex(
            behavior,
            [x, y, z],
            p,
            time,
            pose,
            prepared.get(behavior),
          );
        } else if (behavior.pack === 'legacy') {
          [x, y, z] = animateLegacyVertex(behavior, [x, y, z], p, time, pose);
        } else if (behavior.pack === 'bloom') {
          if (!prepared.has(behavior))
            prepared.set(behavior, prepareBloomMotion(behavior, p, time, pose));
          [x, y, z] = animateBloomVertex(
            behavior,
            [x, y, z],
            p,
            time,
            pose,
            prepared.get(behavior),
          );
        } else [x, y, z] = animateFrontierVertex(behavior, [x, y, z], p, time, pose);
      }
      switch (behavior) {
        case 'tail':
          x += Math.sin(phase * 0.85 - span * 1.1) * span * 0.16 * (pose.tail ?? 0.6) * flex * s;
          break;
        case 'row': {
          const a = side * (Math.sin(phase) * 0.47 * (pose.paddle ?? 0.5) + p.bend * 0.22) * flex;
          q = rotate([x, y, z], 'z', a);
          [x, y, z] = rotate(
            q,
            'y',
            Math.max(0, Math.cos(phase)) * 0.48 * (pose.paddle ?? 0.5) * flex,
          );
          break;
        }
        case 'bell': {
          const contraction = 1 - Math.max(0, Math.sin(phase)) * 0.22 * (pose.pulse ?? 0.5) * flex;
          x *= contraction;
          z *= contraction;
          y = (y + 0.1 * length) * (1 + (1 - contraction) * 0.4) - 0.1 * length;
          break;
        }
        case 'ribbon':
          x += Math.sin(phase * 0.7 - span * 3.2 + z / s) * span * 0.095 * flex * s;
          break;
        case 'foil':
          x +=
            side *
            Math.sin(phase * 0.8 - span * 2 + z / s) *
            Math.pow(Math.max(0, span), 1.3) *
            0.22 *
            flex *
            s;
          break;
        case 'wing': {
          const flap = (pose.flap ?? 0.3) * flex,
            a =
              side *
              (Math.sin(phase) * flap * 0.55 + (1 - (pose.wingOpen ?? 1)) * 0.52 + p.bend * 0.3);
          [x, y, z] = rotate([x, y, z], 'z', a);
          x += side * Math.sin(phase - 1.1) * Math.max(0, span - 1) * 0.12 * flap * s;
          break;
        }
        case 'spin':
          [x, y, z] = rotate(
            [x, y, z],
            'y',
            time * 3.2 * (pose.wingRate ?? 1) * flex + p.phase * TAU,
          );
          break;
        case 'caseL':
        case 'caseR': {
          const direction = behavior === 'caseL' ? -1 : 1,
            open = clamp((pose.flap ?? 0.2) * 0.7 + 0.15, 0, 1);
          [x, y, z] = rotate([x, y, z], 'z', -direction * open * 0.9 * flex);
          break;
        }
        case 'sac': {
          const k =
            1 + Math.sin(time * 1.5 + p.phase * TAU) * 0.03 * (pose.layers?.breath ?? 1) * p.flex;
          x *= k;
          z *= k;
          break;
        }
        case 'blink':
          z *=
            1 -
            Math.max(0, 1 - Math.abs(((time + p.phase * 4.9) % 4.9) - 4.55) / 0.11) *
              0.94 *
              Math.min(1, pose.layers?.blink ?? 1);
          break;
        case 'port': {
          const k =
            1 + Math.sin(phase) * 0.1 * (pose.jaw ?? 0.2) * (pose.layers?.jaw ?? 1) * p.flex;
          x *= k;
          z *= k;
          break;
        }
        case 'arms': {
          const k = span * span * flex;
          x += Math.sin(time * 1.4 + p.phase * TAU - span * 3 + z) * 0.12 * k * s;
          z += Math.cos(time * 1.2 - span * 3.2 + x) * 0.08 * k * s;
          break;
        }
      }
      positions[i] = x * mirror;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }
    meshNormals(positions, c.indices, normals);
    return {
      name: c.name,
      material: c.material,
      positions,
      normals,
      indices: c.indices,
      uvs: c.uvs,
      restPositions: c.positions,
      kind: 'procedural-part',
    };
  });
}
/** Match Three's Y-to-normal quaternion, then local Y twist and local X bend. */
export function placeTidalPoint(point, part) {
  let v = rotate(point, 'x', (part.bend ?? 0) * 0.12);
  v = rotate(v, 'y', (part.twist ?? 0) * (part.mirrorSide ?? 1));
  const n = unit(part.normal),
    q = n[1] < -0.999999 ? [1, 0, 0, 0] : [n[2], 0, -n[0], 1 + n[1]],
    len = Math.hypot(...q);
  for (let i = 0; i < 4; i++) q[i] /= len;
  const t = mul(cross(q.slice(0, 3), v), 2);
  v = add(v, add(mul(t, q[3]), cross(q.slice(0, 3), t)));
  return add(v, part.position);
}
