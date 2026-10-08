/** Original attachment families, now expressed as immutable, engine-free plans.
 * Shapes retain their gene IDs, dimensions, and variants. Triangulation is new.
 * Animation starts from rest data. Protected eye and mouth details retain color.
 */
import { grid, sphere, tube, rod, rotate, rotated, translated, merge } from './parametric-mesh.js';
const TAU = Math.PI * 2;
const behavior = (mode, extra = {}) => ({ pack: 'classic', mode, ...extra });
const ellipsoid = (c, s) => sphere(c, s, 12, 20);
const ring = (r, thickness, yscale = 1) =>
  tube(
    t => [Math.cos(t * TAU) * r, 0, Math.sin(t * TAU) * r * yscale],
    () => thickness,
    32,
    8,
  );
const cone = (a, b, r) =>
  tube(
    t => a.map((x, i) => x + (b[i] - x) * t),
    t => r * (1 - t) + 0.001,
    8,
    10,
  );
const fan = points =>
  grid(points.length - 1, 6, (v, u) => {
    const k = Math.min(points.length - 2, Math.floor(v * (points.length - 1))),
      f = v * (points.length - 1) - k;
    return points[k].map((x, i) => (x + (points[k + 1][i] - x) * f) * u);
  });
export function buildClassicPart(p, add) {
  const v = p.variant,
    side = (p.side || 1) * (p.mirrorSide ?? 1);
  switch (p.type) {
    case 'eye': {
      add(rod([0, 0, 0], [0, 0.3, 0], 0.115), 'skin');
      const eye = behavior('eye'),
        pupil = behavior('pupil');
      add(ellipsoid([0, 0.255, 0], [0.28, 0.21, 0.28]), 'skin', eye);
      add(ellipsoid([0, 0.365, 0.01], [0.25, 0.21, 0.25]), 'eye', eye, true);
      add(ellipsoid([0, 0.547, 0.015], [0.155, 0.035, 0.155]), 'iris', pupil, true);
      add(
        ellipsoid([0, 0.57, 0.02], [v === 1 ? 0.035 : 0.078, 0.026, v === 2 ? 0.05 : 0.115]),
        'pupil',
        pupil,
        true,
      );
      add(ellipsoid([-0.045, 0.59, 0.064], [0.041, 0.015, 0.043]), 'glint', pupil, true);
      break;
    }
    case 'horn': {
      add(
        tube(
          t => [side * (0.18 + v * 0.12) * t * t, 0.95 * t, -(0.34 + p.bend * 0.3) * t * t],
          t => 0.22 * Math.pow(1 - t, 0.85) + 0.003,
          28,
          14,
        ),
        'bone',
      );
      break;
    }
    case 'tail': {
      const count = 8 + v;
      for (let i = 0; i < count; i++) {
        const radius = 0.24 * Math.pow(1 - i / (9 + v), 1.15),
          a = behavior('chain', { i, step: 0.255, club: false }),
          mat = i < 6 ? 'skin' : 'accent';
        add(
          translated(
            tube(
              t => [0, t * 0.28, 0],
              t => radius + (Math.max(0.008, radius - 0.036) - radius) * t,
              2,
              12,
            ),
            [0, i * 0.255, 0],
          ),
          mat,
          a,
        );
        add(ellipsoid([0, i * 0.255, 0], [radius, radius, radius]), mat, a);
      }
      break;
    }
    case 'fin': {
      const height = t => Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.8) * (0.9 + v * 0.16);
      add(
        grid(16, 6, (t, u) => [0, u * (height(t) + 0.025), (t - 0.5) * 1.45]),
        'membrane',
        behavior('fin'),
      );
      for (let i = 1; i < 8; i++) {
        const t = i / 8,
          z = (t - 0.5) * 1.45;
        add(rod([0, 0, z], [0, height(t), z], 0.022), 'skin', behavior('fin'));
      }
      break;
    }
    case 'mouth': {
      const a = behavior('mouth');
      add(ellipsoid([0, 0.035, 0], [0.32, 0.07, 0.19]), 'dark', a, true);
      add(translated(ring(0.265, 0.055, 0.68), [0, 0.055, 0]), 'skin', a);
      for (let i = 0; i < 6 + v * 2; i++) {
        const t = (i / (6 + v * 2)) * TAU,
          x = Math.cos(t) * 0.21,
          z = Math.sin(t) * 0.13;
        add(cone([x, 0.073, z], [x * 0.52, 0.073, z * 0.52], 0.041), 'accent', a);
      }
      break;
    }
    case 'wing': {
      const reach = 1 + v * 0.16,
        points = [
          [0, 0.2, -0.65],
          [0, 1.25, -1.05],
          [0, 1.9, -0.63],
          [0, 2.1, 0.18],
          [0, 1.35, 0.82],
          [0, 0.28, 0.44],
        ].map(q => [0, q[1] * reach, q[2]]),
        a = behavior('wing');
      add(fan(points), 'membrane', a);
      for (const q of points) add(rod([0, 0, 0], q, 0.035), 'skin', a);
      break;
    }
    case 'tentacle':
    case 'antenna': {
      const antenna = p.type === 'antenna',
        length = antenna ? 1.05 + v * 0.22 : 1.7 + v * 0.24,
        radius = antenna ? 0.045 : 0.2,
        a = behavior('tube', { length, antenna });
      add(
        tube(
          t => [p.bend * t * t * 0.45, t * length, 0],
          t => radius * Math.pow(1 - t, 0.8) + 0.012,
          28,
          12,
        ),
        'skin',
        a,
      );
      if (antenna) {
        const r = 0.12 + v * 0.035;
        add(
          ellipsoid([p.bend * 0.45, length, 0], [r, r, r]),
          'glow',
          behavior('tube-tip', { length, antenna: true }),
        );
      }
      break;
    }
    case 'shell': {
      add(
        grid(16, 28, (t, u) => [
          0.82 * Math.sin((t * Math.PI) / 2) * Math.cos(u * TAU),
          (0.4 + v * 0.08) * Math.cos((t * Math.PI) / 2),
          1.04 * Math.sin((t * Math.PI) / 2) * Math.sin(u * TAU),
        ]),
        'armor',
      );
      add(translated(ring(0.84, 0.055, 1.25), [0, 0.015, 0]), 'accent');
      for (let row = -1; row <= 1; row++)
        for (let col = -1; col <= 1; col++) {
          const x = col * 0.39,
            z = row * 0.47,
            y = 0.4 * Math.sqrt(Math.max(0.08, 1 - (x * x) / 0.7 - (z * z) / 1.1));
          add(
            translated(rotated(ellipsoid([0, 0, 0], [0.24, 0.07, 0.28]), 'z', -col * 0.18), [
              x,
              y,
              z,
            ]),
            'armor',
          );
        }
      break;
    }
    case 'mandible': {
      const a = behavior('mandible'),
        curve = t => [side * (0.08 + t * t * (0.4 + p.bend * 0.15)), t * 0.85, 0];
      add(
        tube(curve, t => 0.14 * (1 - t) + 0.01, 20, 10),
        'armor',
        a,
      );
      for (let i = 1; i <= 4 + v; i++) {
        const q = curve(i / (6 + v));
        q[0] -= side * 0.06;
        add(cone(q, [q[0] - side * 0.18, q[1], q[2]], 0.06), 'accent', a);
      }
      break;
    }
    case 'crest': {
      add(ellipsoid([0, 0.06, 0], [0.16, 0.12, 0.8]), 'skin');
      for (let i = 0; i < 5 + v; i++) {
        const u = i / (4 + v),
          h = 0.35 + Math.sin(u * Math.PI) * 0.55;
        add(
          translated(
            tube(
              t => [p.bend * t * t * 0.18, t * h, -t * t * 0.17],
              t => 0.11 * (1 - t) + 0.002,
              16,
              10,
            ),
            [0, 0.04, (u - 0.5) * 1.35],
          ),
          'accent',
        );
      }
      break;
    }
    case 'clubtail': {
      for (let i = 0; i < 6; i++) {
        const r = 0.18 - i * 0.014;
        add(
          ellipsoid([0, i * 0.24 + 0.12, 0], [r, 0.19, r]),
          'skin',
          behavior('chain', { i, step: 0.24, club: true }),
        );
      }
      const a = behavior('chain', { i: 5, step: 0.24, club: true });
      add(ellipsoid([0, 1.6, 0], [0.34, 0.43, 0.34]), 'armor', a);
      for (let i = 0; i < 6 + v * 2; i++) {
        const angle = (i / (6 + v * 2)) * TAU,
          x = Math.cos(angle),
          z = Math.sin(angle);
        add(cone([x * 0.27, 1.64, z * 0.27], [x * 0.55, 1.7, z * 0.55], 0.09), 'accent', a);
      }
      break;
    }
    case 'frill': {
      const points = [];
      for (let i = 0; i <= 16; i++) {
        const angle = -1.25 + (i / 16) * 2.5,
          r = 0.9 + (i % 2 ? -0.12 : 0) + v * 0.1;
        points.push([Math.sin(angle) * r, Math.cos(angle) * r, 0.04]);
      }
      const a = behavior('frill');
      add(fan(points), 'membrane', a);
      for (let i = 0; i < points.length; i += 2) add(rod([0, 0, 0], points[i], 0.022), 'accent', a);
      break;
    }
    case 'claw': {
      add(ellipsoid([0, 0.25, 0], [0.15, 0.32, 0.15]), 'skin');
      for (const s of [-1, 1])
        add(
          translated(
            tube(
              t => [s * Math.sin(t * Math.PI) * (0.25 + v * 0.04), t * 0.66, 0],
              t => 0.14 * (1 - t) + 0.008,
              20,
              10,
            ),
            [s * 0.07, 0.48, 0],
          ),
          'armor',
          behavior('claw', { side: s }),
        );
      break;
    }
    case 'gill': {
      add(rod([0, 0, 0], [0, 0.6, 0], 0.045), 'skin');
      for (let i = 0; i < 5 + v; i++) {
        const s = 0.7 - i * 0.06,
          points = [
            [s * 0.55, s * 0.4, 0],
            [s * 0.75, s, 0],
            [0, s * 0.7, 0],
            [-s * 0.75, s, 0],
            [-s * 0.55, s * 0.4, 0],
          ];
        add(translated(fan(points), [0, 0.09 * i, 0]), 'membrane', behavior('gill', { i }));
      }
      break;
    }
    default:
      throw new Error('Unknown classic part ' + p.type);
  }
}
/** Cache transforms once per moving range, not once per vertex. */
export function prepareClassicMotion(a, p, time, pose = {}) {
  const f = p.flex ?? 1,
    layer = k => pose.layers?.[k] ?? 1,
    phase = time * TAU + (p.phase ?? 0) * TAU,
    side = (p.side || 1) * (p.mirrorSide ?? 1);
  if (a.mode === 'chain') {
    const angles = [];
    for (let j = 0; j <= a.i; j++)
      angles.push(
        a.club
          ? [
              (0.035 + p.bend * 0.07) * f,
              Math.sin(time * 1.6 - j * 0.6 + p.phase * TAU) *
                0.14 *
                f *
                (pose.tail ?? 0.6) *
                layer('tail'),
            ]
          : [
              (0.045 +
                Math.sin(time * 1.3 - j * 0.5 + p.phase * TAU) * 0.11 * layer('tail') +
                p.bend * 0.05) *
                f,
              Math.sin(time * (1.6 + (pose.speed ?? 0) * 0.2) - j * 0.58 + p.phase * TAU) *
                (0.16 + (pose.speed ?? 0) * 0.018) *
                (pose.tail ?? 1) *
                layer('tail') *
                f,
            ],
      );
    return { angles };
  }
  if (a.mode === 'eye' || a.mode === 'pupil') {
    const t = time + p.phase * 4.9,
      blink = Math.max(0, 1 - Math.abs(((((t + side * 0.035) % 4.9) + 4.9) % 4.9) - 4.55) / 0.11);
    return {
      blink: 1 - blink * 0.92 * Math.min(1, layer('blink') * f),
      dx: Math.sin(t * 0.65) * 0.022 * layer('gaze') * f,
      dz: Math.sin(t * 0.4) * 0.015 * layer('gaze') * f,
    };
  }
  return { f, phase };
}
export function animateClassicVertex(a, point, p, time, pose = {}, prepared = {}) {
  const s = p.size,
    l = s * p.length,
    f = p.flex ?? 1,
    layer = k => pose.layers?.[k] ?? 1,
    side = (p.side || 1) * (p.mirrorSide ?? 1);
  // All coordinates below are rest units. Apply nonuniform gene scale afterwards.
  let q = [point[0] / s, point[1] / l, point[2] / s];
  if (f === 0) return point;
  const hinge = (axis, angle, pivot = [0, 0, 0]) =>
    rotate(
      q.map((x, i) => x - pivot[i]),
      axis,
      angle,
    ).map((x, i) => x + pivot[i]);
  switch (a.mode) {
    case 'eye':
    case 'pupil':
      q[2] *= prepared.blink;
      if (a.mode === 'pupil') {
        q[0] += prepared.dx;
        q[2] += prepared.dz * prepared.blink;
      }
      break;
    case 'chain': {
      q[1] -= a.i * a.step;
      for (let j = a.i; j >= 0; j--) {
        const [x, z] = prepared.angles[j];
        q = rotate(rotate(q, 'z', z), 'x', x);
        if (j > 0) q[1] += a.step;
      }
      break;
    }
    case 'fin':
      q[0] += Math.sin(time * 2.3 + q[2] * 3 + p.phase * TAU) * q[1] * 0.075 * layer('flex') * f;
      break;
    case 'mouth':
      q[2] *=
        1 +
        Math.sin(time * 2.2 + p.phase * TAU) *
          (0.06 + (pose.speed ?? 0) * 0.03 + (pose.jaw ?? 0)) *
          layer('jaw') *
          f;
      break;
    case 'wing': {
      const flap = (pose.flap ?? 0.3) * layer('flex') * f;
      q[0] += Math.sin(time * 5.5 + q[2] * 2) * 0.035 * flap * q[1];
      q = rotate(
        q,
        'z',
        side * (Math.sin(time * 5.5 + p.phase * TAU) * 0.5 * flap + p.bend * 0.3 * f),
      );
      break;
    }
    case 'tube':
    case 'tube-tip': {
      const u = a.mode === 'tube-tip' ? 1 : Math.max(0, Math.min(1, q[1] / a.length)),
        t = time * (a.antenna ? 1.3 : 1.6) + p.phase * TAU,
        amp = (a.antenna ? 0.19 : 0.4) * f * layer('flex');
      q[0] += Math.sin(t - u * 4.5) * u * u * amp;
      q[1] -= 0.1 * u * u * amp;
      q[2] += Math.cos(t * 0.8 - u * 4) * u * u * amp * 0.6;
      break;
    }
    case 'mandible':
      q = rotate(
        q,
        'z',
        -side *
          (0.12 + Math.sin(time * 2.4 + p.phase * TAU) * 0.18 * (pose.jaw ?? 0.4) * layer('jaw')) *
          f,
      );
      break;
    case 'frill':
      q[0] *= 1 + Math.sin(time * 1.8 + p.phase * TAU) * 0.12 * f * layer('flex');
      q = rotate(q, 'x', (p.bend * 0.45 + Math.sin(time * 1.5) * 0.12 * layer('flex')) * f);
      break;
    case 'claw':
      q = hinge(
        'z',
        a.side *
          (p.bend * 0.2 + (0.08 + Math.sin(time * 2 + p.phase * TAU) * 0.11) * layer('jaw')) *
          f,
        [a.side * 0.07, 0.48, 0],
      );
      break;
    case 'gill':
      q = hinge(
        'x',
        ((a.i - 2) * 0.12 +
          Math.sin(time * 2.1 + a.i * 0.7 + p.phase * TAU) * 0.1 * layer('breath')) *
          f,
        [0, 0.09 * a.i, 0],
      );
      q = hinge('y', ((a.i - 2) * 0.18 + p.bend * 0.4) * f, [0, 0.09 * a.i, 0]);
      break;
  }
  return [q[0] * s, q[1] * l, q[2] * s];
}
