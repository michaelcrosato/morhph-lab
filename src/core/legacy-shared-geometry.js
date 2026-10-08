/** Version 4 parts now use one geometry plan in the Inspector and Workshop.
 * Dimensions and variants follow the old factories. Triangulation is new.
 */
import { grid, sphere, tube, rod, rotate, rotated, translated } from './parametric-mesh.js';
import { box, prism } from './solid-mesh.js';
import { TAU } from './math.js';
const motion = (mode, fields = {}) => ({ pack: 'legacy', mode, ...fields });
const leaf = (w, h, c = 0.15) =>
  grid(12, 4, (t, u) => [
    (u * 2 - 1) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.8) * w,
    t * h,
    (1 - Math.abs(u * 2 - 1)) * 0.09 + Math.sin(t * Math.PI) * c,
  ]);
const ring = (r, y, thick = 0.02) =>
  tube(
    t => [Math.cos(t * TAU) * r, y, Math.sin(t * TAU) * r],
    () => thick,
    32,
    8,
  );
export function buildLegacySharedPart(p, add) {
  const v = p.variant,
    side = (p.side || 1) * (p.mirrorSide ?? 1);
  switch (p.type) {
    case 'ear': {
      const h = v === 2 ? 0.78 : 1.1,
        w = v === 1 ? 0.22 : 0.36,
        a = motion('ear');
      add(leaf(w, h, 0.13), 'skin', a);
      add(translated(leaf(w * 0.65, h * 0.82, 0.13), [0, 0.035, 0.025]), 'membrane', a);
      add(sphere([0, 0.035, 0], [w * 0.72, 0.14, 0.16]), 'skin');
      break;
    }
    case 'antler': {
      const h = v === 1 ? 1.15 : 1.45;
      add(
        tube(
          t => [side * t * t * 0.28, t * h, -t * t * 0.2],
          t => 0.14 * (1 - t) + 0.013,
          22,
          9,
        ),
        'bone',
      );
      const n = v === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const u = 0.28 + (i / (n + 1)) * 0.65,
          s = i % 2 ? 1 : -1,
          l = 0.38 + (i % 2) * 0.16,
          x = side * u * u * 0.28;
        add(
          tube(
            t => [x + side * s * t * 0.34, u * h + t * l, -u * u * 0.2 - t * t * 0.16],
            t => 0.065 * (1 - t) + 0.006,
            16,
            8,
          ),
          'bone',
        );
        if (v === 2)
          add(
            tube(
              t => [
                x + side * s * 0.22 + t * 0.13 * side,
                u * h + l * 0.65 + t * 0.23,
                -0.12 - t * 0.1,
              ],
              t => 0.025 * (1 - t) + 0.004,
              10,
              6,
            ),
            'bone',
          );
      }
      if (v === 1) add(translated(leaf(0.34, 0.76, 0.025), [side * 0.08, 0.34, -0.03]), 'bone');
      add(sphere([0, 0.02, 0], [0.21, 0.12, 0.21]), 'skin');
      break;
    }
    case 'beak': {
      const w = v === 1 ? 0.42 : 0.24,
        l = v === 2 ? 1.18 : 0.72,
        outline = [
          [-w, 0],
          [-w * 0.75, l * 0.48],
          [0, l],
          [w * 0.75, l * 0.48],
          [w, 0],
        ];
      add(translated(prism(outline, 0.22), [0, 0, 0.1]), 'bone', motion('beakup'));
      const low = prism(
        outline.map(([x, y]) => [x * 0.9, y * 0.93]),
        0.121,
      );
      add(translated(low, [0, 0, -0.12]), 'bone', motion('jaw'));
      add(sphere([0, 0.08, 0], [w * 0.77, 0.14, 0.055]), 'dark', motion('beakup'), true);
      if (v === 0)
        add(
          tube(
            t => [0, l - 0.08 + t * 0.15, 0.1 - t * t * 0.28],
            t => 0.09 * (1 - t) + 0.005,
            16,
            8,
          ),
          'bone',
          motion('beakup'),
        );
      break;
    }
    case 'muzzle': {
      const w = v === 1 ? 0.48 : 0.3,
        l = v === 0 ? 0.68 : 0.45;
      add(sphere([0, l * 0.43, 0.06], [w, l * 0.63, 0.25]), 'skin');
      add(sphere([0, l, 0.06], [w * 0.55, 0.14, 0.13]), 'dark', 'none', true);
      add(sphere([0, l * 0.47, -0.15], [w * 0.85, l * 0.54, 0.1]), 'skin', motion('jaw'));
      for (const s of [-1, 1]) {
        add(sphere([s * w * 0.65, l * 0.6, 0.15], [w * 0.52, 0.18, 0.08]), 'accent');
        if (v === 2)
          add(
            tube(
              t => [s * (w * 0.8 + t * t * 0.15), l * 0.3 + t * 0.58, -0.11 + t * t * 0.17],
              t => 0.07 * (1 - t) + 0.003,
              16,
              8,
            ),
            'bone',
            motion('jaw'),
          );
      }
      break;
    }
    case 'crystal': {
      add(sphere([0, 0.06, 0], [0.34, 0.12, 0.32]), 'armor');
      const n = v === 2 ? 3 : v === 1 ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU,
          r = i === 0 ? 0 : 0.23,
          h = i === 0 ? 1.1 : 0.45 + (i % 3) * 0.18;
        let d = grid(1, 5, (t, u) => [
          Math.cos(u * TAU) * 0.16 * (1 - t),
          t * h - h * 0.5,
          Math.sin(u * TAU) * 0.16 * (1 - t),
        ]);
        d = translated(rotated(rotated(d, 'x', Math.sin(a) * 0.23), 'z', -Math.cos(a) * 0.23), [
          Math.cos(a) * r,
          0.1 + h * 0.5,
          Math.sin(a) * r,
        ]);
        add(d, 'glow');
      }
      break;
    }
    case 'foliage': {
      add(rod([0, 0, 0], [0, 0.5, 0], 0.045), 'skin');
      const n = v === 2 ? 3 : v === 0 ? 8 : 5;
      for (let i = 0; i < n; i++) {
        const pivot = v === 2 ? [(i - 1) * 0.22, i * 0.12, 0] : [0, i * 0.035, 0],
          a = motion('leaf', { phase: i * 0.8, pivot, angle: v === 2 ? 0 : i * 2.4 });
        if (v === 2) {
          add(translated(rod([0, 0, 0], [0, 0.56, 0], 0.055), pivot), 'bone', a);
          add(
            translated(
              grid(10, 18, (t, u) => [
                0.32 * Math.sin((t * Math.PI) / 2) * Math.cos(u * TAU),
                0.55 + 0.19 * Math.cos((t * Math.PI) / 2),
                0.32 * Math.sin((t * Math.PI) / 2) * Math.sin(u * TAU),
              ]),
              pivot,
            ),
            'accent',
            a,
          );
        } else
          add(
            translated(
              rotated(leaf(v === 0 ? 0.13 : 0.26, 0.7 + (i % 3) * 0.12, 0.13), 'y', i * 2.4),
              pivot,
            ),
            'membrane',
            a,
          );
      }
      break;
    }
    case 'blade': {
      add(rod([0, -0.1, 0], [0, 0.22, 0], 0.06), 'dark', 'none', true);
      add(sphere([0, -0.11, 0], [0.085, 0.06, 0.085]), 'metal');
      add(sphere([0, 0.22, 0], [0.26, 0.055, 0.075]), 'metal');
      const outline =
        v === 1
          ? [
              [-0.07, 0.24],
              [-0.12, 0.86],
              [0.1, 1.36],
              [0.23, 1.48],
              [0.15, 1.08],
              [0.06, 0.24],
            ]
          : v === 2
            ? [
                [-0.08, 0.23],
                [-0.25, 0.5],
                [-0.25, 1.12],
                [0.2, 1.12],
                [0.13, 0.23],
              ]
            : [
                [-0.08, 0.23],
                [-0.1, 1.12],
                [0, 1.4],
                [0.1, 1.12],
                [0.08, 0.23],
              ];
      // The saber is split into convex sections for a stable fan triangulation.
      if (v === 1) {
        add(prism([outline[0], outline[1], outline[4], outline[5]], 0.05), 'metal');
        add(prism([outline[1], outline[2], outline[3], outline[4]], 0.05), 'metal');
      } else add(prism(outline, 0.05), 'metal');
      if (v !== 1) add(rod([0, 0.29, 0.034], [0, 1.08, 0.034], 0.017), 'accent');
      break;
    }
    case 'shield': {
      if (v === 0) {
        add(
          grid(1, 32, (t, u) => [
            Math.cos(u * TAU) * 0.5,
            (t - 0.5) * 0.11,
            Math.sin(u * TAU) * 0.5,
          ]),
          'armor',
        );
        add(sphere([0, 0, 0], [0.5, 0.055, 0.5], 12, 32), 'armor');
        add(ring(0.48, 0.064, 0.035), 'metal');
        add(sphere([0, 0.1, 0], [0.15, 0.1, 0.15]), 'metal');
      } else {
        const outline =
          v === 1
            ? [
                [-0.4, 0.4],
                [-0.44, -0.1],
                [0, -0.69],
                [0.44, -0.1],
                [0.4, 0.4],
              ]
            : [
                [-0.38, 0.61],
                [-0.43, -0.55],
                [0.43, -0.55],
                [0.38, 0.61],
              ];
        add(rotated(prism(outline, 0.1), 'x', -Math.PI / 2), 'armor');
        add(
          rotated(
            translated(
              prism(
                outline.map(([x, y]) => [x * 0.83, y * 0.83]),
                0.02,
              ),
              [0, 0, 0.062],
            ),
            'x',
            -Math.PI / 2,
          ),
          'accent',
        );
        add(sphere([0, 0.11, 0], [0.13, 0.06, 0.13]), 'metal');
      }
      add(rod([-0.19, -0.09, 0], [0.19, -0.09, 0], 0.042), 'dark', 'none', true);
      break;
    }
    case 'staff': {
      add(rod([0, -1.1, 0], [0, 1.2, 0], 0.055), v === 0 ? 'bone' : 'metal');
      for (let i = 0; i < 5; i++) add(ring(0.06, -0.13 + i * 0.055, 0.016), 'dark', 'none', true);
      if (v === 0)
        add(
          tube(
            t => [Math.sin(t * Math.PI) * 0.2, 1.12 + Math.sin(t * Math.PI * 0.8) * 0.34, 0],
            () => 0.055,
            18,
            8,
          ),
          'bone',
        );
      else if (v === 1) {
        add(
          grid(2, 4, (t, u) => {
            const r = Math.sin(t * Math.PI) * 0.23;
            return [
              Math.cos(u * TAU) * r * 0.85,
              1.36 + Math.cos(t * Math.PI) * 0.23 * 1.55,
              Math.sin(u * TAU) * r * 0.85,
            ];
          }),
          'glow',
        );
        for (const s of [-1, 1])
          add(
            tube(
              t => [s * 0.18 * Math.sin(t * Math.PI), 1.08 + t * 0.48, 0],
              t => 0.033 * (1 - t) + 0.009,
              16,
              8,
            ),
            'metal',
          );
      } else
        for (const s of [-1, 1])
          add(
            tube(
              t => [s * (0.05 + t * 0.2), 1.05 + t * 0.54, -t * t * 0.07],
              t => 0.065 * (1 - t) + 0.012,
              16,
              8,
            ),
            'bone',
          );
      break;
    }
    case 'pack': {
      add(box([0, 0.18, 0], [0.64, 0.3, 0.79]), 'cloth');
      add(sphere([0, 0.21, 0.39], [0.34, 0.2, 0.19]), 'cloth');
      for (const x of [-0.21, 0.21])
        add(box([x, 0.35, 0], [0.07, 0.035, 0.82]), 'dark', 'none', true);
      add(box([0, 0.38, 0.18], [0.14, 0.04, 0.13]), 'metal');
      if (v > 0)
        for (const s of [-1, 1]) add(box([s * 0.41, 0.16, -0.02], [0.2, 0.23, 0.34]), 'cloth');
      if (v === 2) {
        add(rod([-0.415, 0.16, -0.55], [0.415, 0.16, -0.55], 0.15), 'cloth');
        for (const x of [-0.33, 0.33]) add(rod([x, -0.04, -0.57], [x, -0.04, 0.45], 0.03), 'bone');
      }
      break;
    }
    case 'pauldron': {
      for (let i = 0; i < (v === 2 ? 4 : 3); i++)
        add(
          grid(10, 20, (t, u) => [
            (0.42 + i * 0.035) * Math.sin(t * Math.PI * 0.52) * Math.cos(u * TAU),
            -i * 0.08 + 0.23 * Math.cos(t * Math.PI * 0.52),
            (0.38 + i * 0.04) * Math.sin(t * Math.PI * 0.52) * Math.sin(u * TAU),
          ]),
          'armor',
        );
      if (v === 1)
        for (let i = -1; i <= 1; i++)
          add(
            tube(
              t => [i * 0.19 + i * t * 0.1, 0.15 + t * 0.43, -t * t * 0.1],
              t => 0.082 * (1 - t) + 0.003,
              14,
              8,
            ),
            'bone',
          );
      break;
    }
    case 'banner': {
      add(rod([0, 0, 0], [0, 1.8, 0], 0.035), 'bone');
      add(rod([-0.51, 1.6, 0], [0.51, 1.6, 0], 0.027), 'metal');
      add(
        grid(14, 12, (t, u) => {
          const hem =
            v === 0 ? Math.abs(u - 0.5) * 0.35 : v === 1 ? (1 - Math.abs(u - 0.5) * 2) * 0.24 : 0;
          return [(u - 0.5) * (v === 2 ? 1.22 : 0.88), 1.57 - t * (0.96 - hem), 0];
        }),
        'cloth',
        motion('banner'),
      );
      break;
    }
    default:
      throw new Error('Unknown shared legacy part: ' + p.type);
  }
}
export function animateLegacyVertex(a, point, p, time, pose = {}) {
  const s = p.size,
    l = s * p.length,
    f = p.flex * (pose.layers?.flex ?? 1);
  if (p.flex === 0) return point;
  const phase = time * 1.5 + p.phase * TAU,
    side = (p.side || 1) * (p.mirrorSide ?? 1);
  let q = [...point];
  const hinge = (axis, angle, origin = [0, 0, 0]) => {
    const c = origin.map((x, i) => x * (i === 1 ? l : s));
    return rotate(
      q.map((x, i) => x - c[i]),
      axis,
      angle,
    ).map((x, i) => x + c[i]);
  };
  switch (a.mode) {
    case 'ear':
      q = rotate(
        q,
        'z',
        side *
          (0.07 +
            p.bend * 0.45 +
            Math.pow(Math.max(0, Math.sin(phase)), 12) * 0.17 * (pose.layers?.gaze ?? 1) * p.flex),
      );
      return rotate(q, 'x', (p.variant === 2 ? 1.02 : 0) + Math.sin(phase * 0.6) * 0.07 * f);
    case 'jaw':
      return hinge(
        'x',
        -(0.04 + Math.max(0, Math.sin(time * 2 + p.phase * TAU)) * 0.1 + (pose.jaw ?? 0) * 0.2) *
          p.flex *
          (pose.layers?.jaw ?? 1),
      );
    case 'beakup':
      return hinge(
        'x',
        (0.08 +
          (pose.jaw ?? 0.1) * 0.42 +
          Math.max(0, Math.sin(time * 2.1 + p.phase * TAU)) * 0.12) *
          0.12 *
          p.flex *
          (pose.layers?.jaw ?? 1),
      );
    case 'leaf': {
      q = hinge('y', -a.angle, a.pivot);
      q = hinge(
        'x',
        (p.variant === 2 ? 0 : 0.4) +
          p.bend * 0.25 +
          Math.sin(time * 1.6 + a.phase + p.phase * TAU) * 0.11 * f,
        a.pivot,
      );
      return hinge('y', a.angle, a.pivot);
    }
    case 'banner': {
      const v = Math.max(0, Math.min(1, (1.57 - q[1] / l) / 0.96));
      q[2] +=
        Math.sin(time * 2.2 + p.phase * TAU + (q[0] / s + 0.5) * 4 - v * 3) * 0.12 * v * s * f;
      return q;
    }
    default:
      return q;
  }
}
