import { bowPull } from './equipment-pose.js';
/** Shared animal foundations and daily-use props. Local +Y is the mount normal. */
import { grid, sphere, tube, rod, rotate, rotated, translated } from './parametric-mesh.js';
import { box, prism } from './solid-mesh.js';
import { solveTwoBone } from './ik.js';
import { mapSegment } from './bloom-geometry.js';
const TAU = 2 * Math.PI,
  clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const motion = (mode, fields = {}) => ({ pack: 'field', mode, ...fields });
const ring = (radius, y, r = 0.025) =>
  tube(
    t => [Math.cos(t * TAU) * radius, y, Math.sin(t * TAU) * radius],
    () => r,
    32,
    7,
  );
const scaled = (q, p) => q.map((v, i) => v * p.size * (i === 1 ? p.length : 1));
export function buildFieldPart(p, add) {
  const v = p.variant;
  switch (p.type) {
    case 'beastleg': {
      const root = [0, 0, 0],
        knee = [0, 0.51, -0.19],
        foot = [0, 1.07, 0],
        a = motion('leg', { root, knee, foot, bone: 0 }),
        b = motion('leg', { root, knee, foot, bone: 1 });
      add(
        tube(
          t => [0, t * 0.51, -0.19 * t],
          t => 0.17 - 0.065 * t,
          14,
          12,
        ),
        'skin',
        a,
      );
      add(sphere(knee, [0.12, 0.12, 0.12], 10, 14), 'skin', a);
      add(
        tube(
          t => [0, 0.51 + t * 0.56, -0.19 + t * 0.19],
          t => 0.095 - 0.035 * t,
          14,
          10,
        ),
        'skin',
        b,
      );
      if (v === 1) {
        for (const s of [-1, 1])
          add(box([s * 0.074, 1.12, -0.085], [0.132, 0.18, 0.26]), 'bone', b);
      } else {
        add(
          sphere([0, 1.09, -0.06], [v === 2 ? 0.17 : 0.15, 0.105, v === 2 ? 0.27 : 0.22], 10, 16),
          'skin',
          b,
        );
        for (let i = -1; i <= 1; i++) {
          const end = [i * (v === 2 ? 0.18 : 0.09), 1.13, -(v === 2 ? 0.35 : 0.22)];
          add(rod([i * 0.065, 1.09, -0.06], end, v === 2 ? 0.038 : 0.055), 'skin', b);
          if (v === 0)
            add(
              tube(
                t => [end[0], end[1], end[2] - t * 0.065],
                t => 0.022 * (1 - t) + 0.002,
                6,
                6,
              ),
              'bone',
              b,
            );
        }
        if (v === 2)
          add(
            grid(6, 12, (t, u) => [
              (u - 0.5) * 0.38 * t,
              1.135,
              -0.08 - t * 0.27 * (0.8 + 0.2 * Math.cos(u * TAU)),
            ]),
            'membrane',
            b,
          );
      }
      break;
    }
    case 'brushtail': {
      const curve = t => [0, t * 1.65, -0.12 * t * t],
        rad = t =>
          v === 0
            ? 0.035 + 0.22 * Math.pow(Math.sin(Math.PI * t), 0.65)
            : v === 1
              ? 0.055 + 0.14 * Math.exp(-Math.pow((t - 0.84) / 0.14, 2))
              : 0.1 * (1 - t) + 0.025;
      add(tube(curve, rad, 34, 12), 'skin', motion('tail'));
      const count = v === 2 ? 14 : 9;
      for (let i = 0; i < count; i++) {
        const t = 0.18 + (i / (count - 1)) * 0.73,
          q = curve(t);
        for (const s of [-1, 1]) {
          const w = rad(t);
          add(
            tube(
              u => [s * (w * 0.75 + u * 0.09), q[1] + u * 0.1, q[2]],
              u => 0.035 * (1 - u) + 0.002,
              5,
              6,
            ),
            'accent',
            motion('tail'),
          );
        }
      }
      break;
    }
    case 'worktool': {
      add(rod([0, -0.25, 0], [0, 0.95, 0], 0.055), 'bone');
      for (let i = 0; i < 5; i++) add(ring(0.061, -0.12 + i * 0.05, 0.012), 'dark', 'none', true);
      if (v === 0) {
        add(box([0, 0.9, 0], [0.64, 0.22, 0.25]), 'metal');
        for (const s of [-1, 1]) add(box([s * 0.32, 0.9, 0], [0.05, 0.26, 0.28]), 'armor');
      }
      if (v === 1)
        for (const s of [-1, 1])
          add(
            tube(
              t => [s * t * 0.6, 0.99 - t * t * 0.2, 0],
              t => 0.085 * (1 - t) + 0.005,
              18,
              8,
            ),
            'metal',
          );
      if (v === 2) {
        add(
          prism(
            [
              [-0.18, 0.82],
              [-0.24, 1.12],
              [-0.15, 1.38],
              [0.15, 1.38],
              [0.24, 1.12],
              [0.18, 0.82],
            ],
            0.07,
          ),
          'metal',
        );
        add(rod([0, 0.7, 0.05], [0, 1.2, 0.05], 0.025), 'accent');
      }
      break;
    }
    case 'fieldlamp': {
      const a = motion('lamp');
      add(
        tube(
          t => [Math.sin(t * Math.PI) * 0.13, 0.1 - Math.cos(t * Math.PI) * 0.12, 0],
          () => 0.025,
          18,
          7,
        ),
        'metal',
      );
      add(rod([0, 0.13, 0], [0, 0.3, 0], 0.032), 'metal', a);
      add(ring(0.2, 0.35, 0.045), 'metal', a);
      add(ring(0.2, 0.81, 0.045), 'metal', a);
      add(sphere([0, 0.58, 0], [0.11, 0.21, 0.11], 14, 20), 'glow', a, true);
      for (let i = 0; i < (v === 2 ? 3 : 6); i++) {
        const angle = (i / (v === 2 ? 3 : 6)) * TAU;
        add(
          rod(
            [Math.cos(angle) * 0.2, 0.35, Math.sin(angle) * 0.2],
            [Math.cos(angle) * 0.2, 0.81, Math.sin(angle) * 0.2],
            0.022,
          ),
          'metal',
          a,
        );
      }
      add(sphere([0, 0.85, 0], [0.25, 0.09, 0.25], 10, 16), 'armor', a);
      add(sphere([0, 0.31, 0], [0.23, 0.06, 0.23], 10, 16), 'metal', a);
      if (v === 1)
        add(
          grid(12, 18, (t, u) => {
            const angle = (u * 0.65 + 0.175) * TAU;
            return [Math.cos(angle) * 0.215, 0.36 + t * 0.44, Math.sin(angle) * 0.215];
          }),
          'armor',
          a,
        );
      if (v === 2) add(rod([0, 0.85, 0], [0, 1.12, 0], 0.025), 'metal', a);
      break;
    }
    case 'folio': {
      if (v === 0) {
        add(rod([0, 0.07, -0.35], [0, 0.07, 0.35], 0.045), 'dark', 'none', true);
        for (const side of [-1, 1]) {
          const a = motion('book', { side });
          add(box([side * 0.2, 0.055, 0], [0.4, 0.05, 0.74]), 'cloth', a);
          add(box([side * 0.2, 0.092, 0], [0.36, 0.03, 0.67]), 'bone', a, true);
          for (let row = 0; row < 6; row++)
            add(
              rod(
                [side * 0.05, 0.112, -0.23 + row * 0.09],
                [side * (row % 3 === 0 ? 0.3 : 0.34), 0.112, -0.23 + row * 0.09],
                0.005,
              ),
              'dark',
              a,
              true,
            );
        }
      } else if (v === 1) {
        add(
          grid(10, 12, (t, u) => [
            (u - 0.5) * 0.76,
            0.06 + 0.045 * Math.cos((u - 0.5) * Math.PI),
            (t - 0.5) * 0.64,
          ]),
          'bone',
          motion('paper'),
          true,
        );
        for (const side of [-1, 1])
          add(rod([side * 0.39, 0.08, -0.38], [side * 0.39, 0.08, 0.38], 0.06), 'bone');
        for (let i = 0; i < 4; i++)
          add(
            tube(
              t => [-0.3 + t * 0.6, 0.115, -0.22 + i * 0.13 + 0.04 * Math.sin(t * TAU)],
              () => 0.006,
              16,
              5,
            ),
            'accent',
            motion('paper'),
          );
      } else {
        add(box([0, 0.03, 0], [0.57, 0.07, 0.73]), 'bone');
        add(box([0, 0.08, 0], [0.5, 0.02, 0.57]), 'cloth');
        add(box([0, 0.12, 0.32], [0.16, 0.04, 0.07]), 'metal');
        for (let i = 0; i < 5; i++)
          add(
            rod([-0.17, 0.099, -0.2 + i * 0.09], [0.16, 0.099, -0.2 + i * 0.09], 0.005),
            'dark',
            'none',
            true,
          );
        add(rod([0.36, 0.1, -0.26], [0.36, 0.1, 0.25], 0.023), 'bone');
      }
      break;
    }
    case 'bowrig': {
      if (v === 2) {
        add(rod([0, 0.08, 0], [0, 0.75, 0], 0.16), 'cloth');
        add(ring(0.17, 0.78), 'metal');
        for (let i = 0; i < 5; i++) {
          const x = ((i % 3) - 1) * 0.07,
            z = Math.floor(i / 3) * 0.09 - 0.04;
          add(rod([x, 0.15, z], [x, 1.2 + (i % 2) * 0.06, z], 0.012), 'bone');
          add(
            prism(
              [
                [x - 0.04, 0.95],
                [x - 0.04, 1.1],
                [x + 0.02, 1.14],
                [x + 0.02, 1],
              ],
              0.016,
            ),
            'accent',
          );
        }
        break;
      }
      const span = v === 1 ? 1.2 : 0.9;
      for (const side of [-1, 1]) {
        const a = motion('bow', { side });
        add(
          tube(
            t => [
              0,
              side * t * span,
              0.06 +
                0.25 * Math.sin((t * Math.PI) / 2) -
                (v === 1 ? 0.1 : 0) * Math.sin(t * Math.PI),
            ],
            t => 0.055 * (1 - t) + 0.017,
            28,
            9,
          ),
          'bone',
          a,
        );
        add(
          rod([0, 0, 0], [0, side * span, 0.31], 0.009),
          'dark',
          motion('string', { side, span }),
          true,
        );
      }
      add(rod([0, -0.12, 0.06], [0, 0.12, 0.06], 0.07), 'dark', 'none', true);
      break;
    }
    case 'utilitybelt': {
      const path = t => [(t - 0.5) * 1.0, 0.03 - 0.25 * Math.pow((t - 0.5) * 2, 2), 0];
      add(
        tube(path, () => 0.065, 24, 8),
        'cloth',
      );
      add(box([0, 0.11, 0], [0.14, 0.035, 0.12]), 'metal');
      for (const s of [-1, 1]) {
        if (v === 1)
          for (let i = 0; i < 3; i++) {
            add(
              rod([s * (0.18 + i * 0.1), 0.08, -0.08], [s * (0.18 + i * 0.1), 0.08, -0.3], 0.042),
              'bone',
            );
            add(sphere([s * (0.18 + i * 0.1), 0.08, -0.34], [0.04, 0.04, 0.035], 6, 10), 'metal');
          }
        else {
          add(box([s * 0.33, 0.12, -0.14], [0.28, 0.22, v === 2 ? 0.46 : 0.31]), 'cloth');
          add(box([s * 0.33, 0.24, -0.08], [0.055, 0.025, 0.28]), 'dark', 'none', true);
          if (v === 2) add(rod([s * 0.18, 0.14, -0.43], [s * 0.49, 0.14, -0.43], 0.1), 'bone');
        }
      }
      break;
    }
    case 'mantle': {
      const point = (t, u) => {
        const w = (v === 2 ? 0.19 : 0.54) * (1 + t * 0.3),
          notch = v === 1 ? 0.24 * Math.exp(-Math.pow((u - 0.5) / 0.14, 2)) * t * t : 0;
        return [
          (u * 2 - 1) * w,
          0.1 + 0.08 * t + 0.035 * Math.sin(u * Math.PI),
          0.13 - t * (v === 2 ? 1.6 : 1.15) + notch,
        ];
      };
      add(grid(20, 20, point), 'cloth', motion('cloth'));
      for (const u of [0, 1])
        add(
          tube(
            t => point(t, u),
            () => 0.017,
            24,
            6,
          ),
          'accent',
          motion('cloth'),
        );
      add(rod([-0.34, 0.08, 0.13], [0.34, 0.08, 0.13], 0.027), 'bone');
      break;
    }
    default:
      throw new Error('Unknown field part: ' + p.type);
  }
}
export function prepareFieldMotion(a, p, time, pose = {}) {
  if (a.mode !== 'leg') return null;
  const root = scaled(a.root, p),
    knee = scaled(a.knee, p),
    foot = scaled(a.foot, p),
    f = p.flex * (pose.layers?.flex ?? 1),
    rate = pose.rate ?? 0;
  const phase = TAU * (time * rate + p.phase + (p.mirrorSide === -1 ? (pose.phaseLag ?? 0.5) : 0)),
    gain = Math.min(1.5, Math.abs(pose.stride ?? 0)) * f;
  const target = [
    foot[0],
    foot[1] - Math.max(0, Math.sin(phase)) * (pose.lift ?? 0.2) * p.size * f,
    foot[2] + Math.cos(phase) * 0.38 * p.size * gain,
  ];
  if (rate < 0.001 || f === 0)
    return {
      a: a.bone === 0 ? root : knee,
      b: a.bone === 0 ? knee : foot,
      c: a.bone === 0 ? root : knee,
      d: a.bone === 0 ? knee : foot,
    };
  const result = solveTwoBone(
    root,
    target,
    Math.hypot(...knee.map((v, i) => v - root[i])),
    Math.hypot(...foot.map((v, i) => v - knee[i])),
    [0, 0, -1],
  );
  return a.bone === 0
    ? { a: root, b: knee, c: root, d: result.knee }
    : { a: knee, b: foot, c: result.knee, d: result.foot };
}
export function animateFieldVertex(a, point, p, time, pose = {}, prepared = null) {
  const s = p.size,
    l = s * p.length,
    f = p.flex * (pose.layers?.flex ?? 1),
    phase = time * TAU + p.phase * TAU,
    pull = pose.action?.name === 'bowdraw' ? bowPull(pose.action.phase) * pose.action.weight : 0;
  let [x, y, z] = point;
  if (f === 0) return point;
  switch (a.mode) {
    case 'leg': {
      const q = prepared || prepareFieldMotion(a, p, time, pose);
      return mapSegment(point, q.a, q.b, q.c, q.d);
    }
    case 'tail':
      x +=
        Math.sin(time * 2.2 - (y / l) * 1.6 + p.phase * TAU) *
        Math.pow(Math.max(0, y / l), 1.4) *
        0.17 *
        s *
        f *
        (pose.tail ?? 0.6);
      break;
    case 'lamp':
      return rotate(point, 'z', Math.sin(time * 1.5 + p.phase * TAU) * 0.09 * f);
    case 'book':
      return rotate(point, 'z', a.side * (0.12 + 0.12 * Math.sin(time * 0.9)) * f);
    case 'paper':
      y += Math.sin(time * 1.6 + (z / l) * 3) * 0.008 * s * f;
      break;
    case 'bow':
      z -= Math.abs(y / l) * 0.045 * f * pull;
      break;
    case 'string': {
      const t = Math.min(1, Math.abs(y / l) / a.span);
      z -= 0.3 * l * (1 - t) * f * pull;
      break;
    }
    case 'cloth': {
      const t = clamp((0.13 - z / s) / 1.3, 0, 1);
      y += Math.sin(time * 2 + (x / s) * 3 - t * 3 + p.phase * TAU) * 0.065 * l * t * f;
      break;
    }
  }
  return [x, y, z];
}
export function fieldSupportPoints(p) {
  if (p.type !== 'beastleg') return [];
  return [
    [0, 1.225, 0],
    [0, 1.18, -0.25],
  ].map(q => scaled(q, p));
}
