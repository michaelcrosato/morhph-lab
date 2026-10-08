import {
  grid,
  sphere,
  tube,
  rod,
  foil,
  translated,
  rotate,
  reverseWinding,
} from './parametric-mesh.js';
import { TAU, clamp } from './math.js';
const animation = (mode, values = {}) => ({ pack: 'frontier', mode, ...values });
/** Emit local meshes and serializable motion descriptors. +Y is the mount normal.
 * Rigid moving units use their own pivots. Neither backend owns model definitions. */
export function buildFrontierPart(p, add) {
  const v = p.variant;
  switch (p.type) {
    case 'combrail': {
      const count = [10, 12, 14][v],
        length = 2.1;
      add(
        tube(
          t => [0, 0.05 + 0.035 * Math.sin(t * Math.PI), (t - 0.5) * length],
          () => 0.04,
          24,
          8,
        ),
        'accent',
      );
      for (let i = 0; i < count; i++) {
        const z = (i / (count - 1) - 0.5) * length,
          wide = v === 1 ? 0.23 : 0.14,
          h = 0.24 + 0.1 * Math.sin((i / (count - 1)) * Math.PI),
          a = animation('comb', { pivot: [0, 0.07, z], phase: (i / count) * 0.85 });
        add(
          grid(6, 6, (t, u) => [
            (u - 0.5) * 2 * wide * Math.sin((0.15 + t * 0.85) * Math.PI * 0.8),
            0.07 + t * h,
            z + 0.075 * t * t,
          ]),
          'membrane',
          a,
        );
        for (let k = -2; k <= 2; k++)
          add(rod([k * 0.025, 0.07, z], [k * wide * 0.45, 0.07 + h, z + 0.075], 0.009), 'glow', a);
        if (v === 2) add(translated(foil(0.32, 0.055), [0.12, 0.08, z]), 'accent', a);
      }
      break;
    }
    case 'pumpbarrel': {
      const radius = t =>
        v === 0
          ? 0.43 + 0.06 * Math.sin(t * Math.PI)
          : v === 1
            ? 0.5 - 0.28 * t
            : 0.38 + 0.055 * Math.sin(t * Math.PI);
      const emit = (data, material) => {
        if (v === 2) {
          const positions = new Float32Array(data.positions);
          for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1],
              z = positions[i + 2];
            positions[i + 1] = z;
            positions[i + 2] = -(y - 0.75) * 0.37;
          }
          data = { ...data, positions };
        }
        add(data, material, animation(v === 2 ? 'crosspump' : 'pump'));
      };
      for (const inner of [false, true]) {
        const wall = grid(24, 36, (t, u) => {
          const r = radius(t) - (inner ? 0.035 : 0);
          return [Math.cos(u * TAU) * r, t * 1.5, Math.sin(u * TAU) * r];
        });
        emit(inner ? wall : reverseWinding(wall), inner ? 'accent' : 'skin');
      }
      for (let i = 0; i <= 8; i++) {
        const y = (i / 8) * 1.5,
          r = radius(i / 8);
        emit(
          tube(
            t => [Math.cos(t * TAU) * r, y, Math.sin(t * TAU) * r],
            () => (i === 0 || i === 8 ? 0.04 : 0.017),
            36,
            6,
          ),
          i === 0 || i === 8 ? 'bone' : 'accent',
        );
      }
      break;
    }
    case 'radialweb': {
      const arms = [5, 6, 8][v],
        a = animation('radial');
      add(
        grid(18, arms * 14, (r, u) => {
          const t = u * TAU,
            edge = 0.8 + 1.18 * Math.pow(0.5 + 0.5 * Math.cos(t * arms), 2),
            rad = 0.09 + r * edge;
          return [Math.cos(t) * rad, 0.07 + 0.12 * Math.sin(r * Math.PI), Math.sin(t) * rad];
        }),
        'membrane',
        a,
      );
      for (let i = 0; i < arms; i++) {
        const t = (i / arms) * TAU;
        add(
          tube(
            s => [Math.cos(t) * s * 2, 0.075 + Math.sin(s * Math.PI) * 0.12, Math.sin(t) * s * 2],
            s => 0.1 * (1 - s) + 0.015,
            24,
            8,
          ),
          'skin',
          a,
        );
        add(
          sphere([Math.cos(t) * 1.92, 0.08, Math.sin(t) * 1.92], [0.07, 0.05, 0.07], 8, 10),
          'glow',
          a,
        );
      }
      break;
    }
    case 'mantleskirt': {
      const a = animation('mantle');
      const point = (r, u) => {
        const t = u * TAU,
          scallop = 1 + 0.11 * Math.cos(t * (v === 1 ? 10 : 6)),
          rad = 0.13 + r * scallop,
          x = Math.cos(t) * rad * (v === 2 ? 1.2 : 1),
          z = Math.sin(t) * rad * 1.55;
        return [x, 0.06 + 0.21 * (1 - r) + r * r * 0.1 * Math.sin(t * (v === 0 ? 18 : 10)), z];
      };
      add(grid(22, 80, point), 'skin', a);
      add(
        tube(
          t => point(1, t),
          () => 0.035,
          100,
          6,
        ),
        'accent',
        a,
      );
      if (v === 2)
        for (let i = 0; i < 6; i++) {
          const t = i / 6;
          add(
            tube(
              r => point(r, t),
              () => 0.026,
              25,
              6,
            ),
            'glow',
            a,
          );
        }
      break;
    }
    case 'swimmeret': {
      const count = [6, 8, 10][v];
      add(rod([0, 0, -1.2], [0, 0, 1.2], 0.075), 'armor');
      for (let i = 0; i < count; i++) {
        const z = -1.12 + (i / (count - 1)) * 2.24,
          a = animation('scull', { pivot: [0, 0, z], phase: i / count });
        add(rod([0, 0, z], [0, 0.47, z], 0.043), 'bone', a);
        add(translated(foil(0.62, v === 2 ? 0.14 : 0.2), [0, 0.35, z]), 'membrane', a);
        add(sphere([0, 0.01, z], [0.09, 0.09, 0.09], 8, 10), 'armor');
      }
      break;
    }
    case 'branchfan': {
      const count = [3, 5, 7][v];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU,
          a = animation('branch', { phase: i / count, axis: i % 2 ? 'x' : 'z' }),
          curve = t => [
            Math.cos(angle) * t * 0.45,
            t * (1.2 + (i % 2) * 0.18),
            Math.sin(angle) * t * 0.45,
          ];
        add(
          tube(curve, t => 0.05 * (1 - t) + 0.008, 20, 7),
          'skin',
          a,
        );
        for (let j = 1; j <= 7; j++)
          for (const side of [-1, 1]) {
            const t = j / 9,
              q = curve(t),
              reach = (1 - t) * 0.29;
            add(
              tube(
                u => [
                  q[0] + side * Math.sin(angle) * u * reach,
                  q[1] + u * 0.16,
                  q[2] - side * Math.cos(angle) * u * reach,
                ],
                u => 0.018 * (1 - u) + 0.003,
                8,
                5,
              ),
              'accent',
              a,
            );
          }
      }
      break;
    }
    case 'ringwing': {
      const rings = v === 2 ? 2 : 1,
        a = animation('ring');
      for (let i = 0; i < rings; i++) {
        const y = 0.52 + i * 0.52,
          rx = v === 1 ? 1.85 : 1.5,
          rz = v === 1 ? 1.15 : 1.5;
        add(
          grid(64, 12, (u, t) => {
            const angle = u * TAU,
              profile = t * TAU,
              w = Math.cos(profile) * 0.19;
            return [
              Math.cos(angle) * (rx + w),
              y + Math.sin(profile) * 0.065,
              Math.sin(angle) * (rz + w),
            ];
          }),
          'membrane',
          a,
        );
        for (let k = 0; k < 4; k++) {
          const t = (k / 4) * TAU;
          add(rod([0, 0, 0], [Math.cos(t) * rx, y, Math.sin(t) * rz], 0.045), 'bone', a);
        }
        add(
          tube(
            t => [Math.cos(t * TAU) * rx, y + 0.065, Math.sin(t * TAU) * rz],
            () => 0.017,
            64,
            6,
          ),
          'accent',
          a,
        );
      }
      break;
    }
    case 'pappus': {
      const a = animation('canopy'),
        crowns = v === 1 ? 2 : 1;
      add(rod([0, 0, 0], [0, 0.86, 0], 0.07), 'skin');
      for (let j = 0; j < crowns; j++)
        for (let i = 0; i < 36; i++) {
          const angle = ((i + j * 0.5) / 36) * TAU,
            rad = j === 0 ? 1.6 : 1.15,
            y = 0.86 + j * 0.4,
            curve = t => [
              Math.cos(angle) * t * rad,
              y + (v === 2 ? -0.42 : 0.27) * Math.sin(t * Math.PI) - t * 0.18,
              Math.sin(angle) * t * rad,
            ];
          add(
            tube(curve, t => 0.016 * (1 - t) + 0.005, 20, 5),
            i % 4 ? 'bone' : 'accent',
            a,
          );
          for (const sign of [-1, 1]) {
            const base = curve(0.76);
            add(
              tube(
                t => [
                  base[0] + Math.cos(angle + sign * 0.22) * t * 0.42,
                  base[1] + t * 0.06,
                  base[2] + Math.sin(angle + sign * 0.22) * t * 0.42,
                ],
                t => 0.009 * (1 - t) + 0.002,
                8,
                5,
              ),
              'membrane',
              a,
            );
          }
        }
      break;
    }
    case 'sailcell': {
      const count = v === 0 ? 3 : 4;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU,
          dir = [Math.cos(angle), Math.sin(angle)],
          a = animation('sail', { phase: i / count });
        if (v === 2) {
          add(
            grid(20, 14, (t, u) => {
              const r = (1 - Math.abs(t * 2 - 1)) * 1.2 * (u * 2 - 1);
              return [dir[0] * r, 0.08 + t * 1.9, dir[1] * r];
            }),
            'membrane',
            a,
          );
          for (const sign of [-1, 1]) {
            add(
              rod([0, 0.08, 0], [dir[0] * 1.2 * sign, 1.03, dir[1] * 1.2 * sign], 0.035),
              'bone',
              a,
            );
            add(
              rod([0, 1.98, 0], [dir[0] * 1.2 * sign, 1.03, dir[1] * 1.2 * sign], 0.035),
              'bone',
              a,
            );
          }
          if (i === 1) break;
        } else {
          add(
            grid(20, 12, (t, u) => {
              const r = (1 - t) * u * 1.35;
              return [dir[0] * r, 0.15 + t * 1.8, dir[1] * r];
            }),
            'membrane',
            a,
          );
          add(rod([0, 0.15, 0], [dir[0] * 1.35, 0.15, dir[1] * 1.35], 0.035), 'bone', a);
          add(rod([0, 1.95, 0], [dir[0] * 1.35, 0.15, dir[1] * 1.35], 0.035), 'bone', a);
        }
      }
      add(rod([0, 0, 0], [0, 2.05, 0], 0.055), 'armor');
      break;
    }
    case 'helixvane': {
      const count = v + 1,
        a = animation('spin', { direction: 1 });
      add(rod([0, 0, 0], [0, 2.3, 0], 0.07), 'armor');
      for (let i = 0; i < count; i++) {
        const point = (t, u) => {
          const angle = t * TAU * 1.15 + (i / count) * TAU,
            r = 0.14 + u * (0.7 + 0.2 * Math.sin(t * Math.PI));
          return [Math.cos(angle) * r, 0.12 + t * 2.12, Math.sin(angle) * r];
        };
        add(grid(72, 10, point), 'membrane', a);
        add(
          tube(
            t => point(t, 1),
            () => 0.026,
            80,
            6,
          ),
          'accent',
          a,
        );
      }
      break;
    }
    case 'ductfan': {
      add(
        grid(48, 12, (u, t) => {
          const angle = u * TAU,
            b = t * TAU,
            r = 0.66 + Math.cos(b) * 0.1;
          return [Math.cos(angle) * r, 0.3 + Math.sin(b) * 0.22, Math.sin(angle) * r];
        }),
        'armor',
      );
      for (let k = 0; k < 4; k++) {
        const t = (k / 4) * TAU;
        add(rod([0, 0.1, 0], [Math.cos(t) * 0.65, 0.1, Math.sin(t) * 0.65], 0.035), 'bone');
      }
      const levels = v === 2 ? 2 : 1,
        count = v === 0 ? 3 : 5;
      for (let l = 0; l < levels; l++) {
        const y = 0.23 + l * 0.18,
          a = animation('spin', { direction: l ? -1 : 1 });
        add(sphere([0, y, 0], [0.15, 0.12, 0.15], 10, 14), 'metal', a);
        for (let i = 0; i < count; i++)
          add(
            grid(10, 8, (t, u) => {
              const angle = (i / count) * TAU + t * 0.45,
                r = 0.12 + t * 0.46,
                w = (u - 0.5) * 0.28;
              return [
                Math.cos(angle) * r - Math.sin(angle) * w,
                y + w * 0.3,
                Math.sin(angle) * r + Math.cos(angle) * w,
              ];
            }),
            'metal',
            a,
          );
      }
      break;
    }
    case 'foldwing': {
      const count = [5, 7, 9][v];
      for (let i = 0; i < count; i++) {
        const from = -0.55 + (i / count) * 1.1,
          to = -0.55 + ((i + 1) / count) * 1.1,
          a = animation('fold', { phase: i / count, panel: i, count });
        const point = (t, u) => {
          const angle = from + (to - from) * u,
            r = 0.1 + t * (1.8 + 0.25 * Math.sin((i / count) * Math.PI));
          return [
            0.045 * Math.sin(u * Math.PI) * (i % 2 ? -1 : 1),
            r * Math.cos(angle),
            r * Math.sin(angle),
          ];
        };
        add(grid(12, 5, point), i % 2 ? 'membrane' : 'skin', a);
        add(
          tube(
            t => point(t, 0),
            t => 0.026 * (1 - t) + 0.009,
            12,
            6,
          ),
          'accent',
          a,
        );
      }
      break;
    }
    default:
      throw new Error('Unknown Strange Forms part: ' + p.type);
  }
}
/** Analytic time sampling. Input positions are in the unmirrored, scaled rest frame.
 * Hinge pivots use the same nonuniform scale as source geometry. */
export function animateFrontierVertex(a, point, p, time, pose = {}) {
  const size = p.size,
    length = size * p.length,
    flex = p.flex * (pose.layers?.flex ?? 1);
  if (flex === 0) return point;
  const phase = TAU * (time * (pose.wingRate || 1) + (p.phase || 0) + (a.phase || 0)),
    gain = key => clamp(pose[key] ?? 0, 0, 2);
  let [x, y, z] = point;
  const hinge = (axis, angle, pivot = [0, 0, 0]) => {
    const origin = [pivot[0] * size, pivot[1] * length, pivot[2] * size],
      q = rotate([x - origin[0], y - origin[1], z - origin[2]], axis, angle * flex);
    return q.map((n, i) => n + origin[i]);
  };
  switch (a.mode) {
    case 'comb':
      return hinge('x', Math.sin(phase) * (0.12 + 0.56 * gain('comb')), a.pivot);
    case 'pump': {
      const pulse =
          (0.05 + 0.17 * Math.max(gain('pump'), gain('pulse'))) *
          (0.5 + 0.5 * Math.sin(phase)) *
          flex,
        profile = Math.sin(clamp(y / length / 1.5, 0, 1) * Math.PI);
      x *= 1 - pulse * profile;
      z *= 1 - pulse * profile;
      y *= 1 + pulse * 0.1;
      break;
    }
    case 'crosspump': {
      const pulse =
          (0.05 + 0.17 * Math.max(gain('pump'), gain('pulse'))) *
          (0.5 + 0.5 * Math.sin(phase)) *
          flex,
        profile = Math.cos((clamp(z / size / 0.2775, -1, 1) * Math.PI) / 2);
      x *= 1 - pulse * profile;
      y *= 1 - pulse * profile;
      break;
    }
    case 'radial': {
      const r = Math.hypot(x, z) / size,
        k = Math.sin(phase) * (0.04 + 0.25 * gain('spread')) * flex;
      y += r * r * 0.14 * k * length;
      const close = 1 - Math.max(0, k) * 0.24;
      x *= close;
      z *= close;
      break;
    }
    case 'mantle': {
      const t = Math.atan2(z / 1.55, x),
        r = clamp(Math.hypot(x, z / 1.55) / size, 0, 1.2);
      y +=
        Math.sin(phase - t * 3) *
        r *
        r *
        0.12 *
        length *
        flex *
        (0.3 + gain('scull') + gain('spread') * 0.35);
      break;
    }
    case 'scull': {
      const strength = 0.15 + 0.65 * Math.max(gain('scull'), gain('paddle')),
        wave = Math.sin(phase);
      let q = hinge('x', wave * strength, a.pivot);
      const origin = [0, 0, a.pivot[2] * size];
      q = rotate(
        [q[0], q[1], q[2] - origin[2]],
        'y',
        Math.max(0, Math.cos(phase)) * 0.65 * strength * flex,
      );
      return [q[0], q[1], q[2] + origin[2]];
    }
    case 'branch':
      return hinge(a.axis, Math.sin(phase * 0.35) * 0.14);
    case 'ring':
      return hinge('z', Math.sin(phase * 0.25) * 0.06);
    case 'canopy': {
      const close = (0.5 + 0.5 * Math.sin(phase)) * 0.24 * gain('spread') * flex,
        r = Math.hypot(x, z) / size;
      x *= 1 - close;
      z *= 1 - close;
      y += r * 0.6 * close * length;
      break;
    }
    case 'sail':
      return hinge('y', Math.sin(phase * 0.4) * (0.02 + 0.14 * gain('spread')));
    case 'spin':
      return hinge(
        'y',
        time * TAU * (pose.wingRate || 1) * (0.08 + 0.55 * gain('spin')) * a.direction +
          (p.phase || 0) * TAU,
      );
    case 'fold': {
      const closed = (0.5 + 0.5 * Math.sin(phase)) * (0.08 + 0.5 * gain('fold')),
        angle = (a.panel / (a.count - 1) - 0.5) * closed;
      return hinge('y', angle + (a.panel % 2 ? 1 : -1) * closed * 0.22);
    }
  }
  return [x, y, z];
}
