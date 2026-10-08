import { grid, sphere, tube, rod, rotate, reverseWinding } from './parametric-mesh.js';
import { solveTwoBone } from './ik.js';
import { TAU, clamp, add as add3, sub, unit, cross } from './math.js';
const behavior = (mode, fields = {}) => ({ pack: 'bloom', mode, ...fields });
const scale = (v, p) => [v[0] * p.size, v[1] * p.size * p.length, v[2] * p.size];
/** Place a rigid segment between two sampled joints. The source is never changed. */
export function mapSegment(point, a, b, c, d) {
  const u = unit(sub(b, a)),
    v = unit(sub(d, c)),
    cos = u.reduce((s, x, i) => s + x * v[i], 0);
  let q;
  if (cos < -0.999999) {
    const axis = unit(cross(u, Math.abs(u[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]));
    q = [...axis, 0];
  } else {
    q = [...cross(u, v), 1 + cos];
    const n = Math.hypot(...q);
    q = q.map(x => x / n);
  }
  const p = sub(point, a),
    t = cross(q.slice(0, 3), p).map(x => x * 2),
    r = add3(
      p,
      add3(
        t.map(x => x * q[3]),
        cross(q.slice(0, 3), t),
      ),
    );
  return add3(c, r);
}
/** +Y is the attachment normal. All models use indexed, generated triangles. */
export function buildBloomPart(p, add) {
  const v = p.variant;
  switch (p.type) {
    case 'legbank': {
      const count = 3 + v,
        span = 1.9;
      add(rod([0, 0, -span / 2], [0, 0, span / 2], 0.085), 'armor');
      for (let i = 0; i < count; i++) {
        const z = (i / (count - 1) - 0.5) * span,
          root = [0, 0, z],
          knee = [0, 0.4, z + 0.24],
          foot = [0, 0.84, z - 0.1],
          common = { root, knee, foot, phase: i / count };
        add(rod(root, knee, 0.06), 'armor', behavior('leg', { ...common, bone: 0 }));
        add(
          sphere(knee, [0.09, 0.09, 0.09], 8, 12),
          'accent',
          behavior('leg', { ...common, bone: 0 }),
        );
        add(rod(knee, foot, 0.044), 'bone', behavior('leg', { ...common, bone: 1 }));
        add(
          sphere(foot, [0.09, 0.09, 0.15], 8, 12),
          'armor',
          behavior('leg', { ...common, bone: 1 }),
        );
        add(sphere(root, [0.115, 0.08, 0.115], 8, 12), 'armor');
      }
      break;
    }
    case 'plateband': {
      const count = [5, 7, 9][v];
      for (let i = 0; i < count; i++) {
        const z = (i / (count - 1) - 0.5) * 2.35,
          a = behavior('plate', { pivot: [0, 0.025, z + 0.24], phase: i / count }),
          w = 0.68 * (0.78 + 0.22 * Math.sin((i / (count - 1)) * Math.PI));
        const point = (t, u) => {
          const dome = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.7),
            x = (u * 2 - 1) * w * (0.94 + 0.06 * Math.sin(t * Math.PI));
          return [
            x,
            -0.28 + 0.38 * dome + 0.065 * Math.sin(t * Math.PI),
            z + (t - 0.5) * 0.7 + (v === 2 ? 0.035 * Math.cos(u * TAU * 4) * t * t : 0),
          ];
        };
        add(grid(12, 18, point), 'armor', a);
        add(
          tube(
            u => point(0.95, u),
            () => 0.024,
            22,
            6,
          ),
          'accent',
          a,
        );
        if (v === 2)
          add(
            tube(
              t => point(t, 0.5),
              () => 0.035,
              12,
              6,
            ),
            'bone',
            a,
          );
      }
      break;
    }
    case 'petalcrown': {
      const count = [5, 7, 9][v];
      add(sphere([0, 0.12, 0], [0.33, 0.15, 0.33], 12, 18), 'accent');
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU,
          a = behavior('petal', { phase: i / count, angle }),
          point = (t, u) => {
            const r = 0.18 + t * 1.22,
              width = 0.48 * Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.65) * (u * 2 - 1),
              height = 0.13 + 0.48 * t * t - 0.12 * Math.sin(u * Math.PI) * Math.sin(t * Math.PI);
            return [
              Math.cos(angle) * r - Math.sin(angle) * width,
              height,
              Math.sin(angle) * r + Math.cos(angle) * width,
            ];
          };
        add(grid(22, 12, point), i % 2 ? 'skin' : 'membrane', a);
        add(
          tube(
            t => point(t, 0.5),
            t => 0.025 * (1 - t) + 0.006,
            22,
            6,
          ),
          'accent',
          a,
        );
      }
      break;
    }
    case 'valvepair': {
      for (const side of [-1, 1]) {
        const a = behavior('valve', { side });
        const point = (t, u) => {
          const angle = (u - 0.5) * Math.PI,
            rad = t * (v === 1 ? 1.22 : 1.45),
            width = v === 2 ? 0.64 : 1.0,
            rib = 1 + (v === 0 ? 0.045 : 0.018) * Math.cos(u * TAU * 12);
          return [
            Math.sin(angle) * rad * width,
            Math.cos(angle) * rad,
            side * (0.045 + 0.22 * Math.sin((t * Math.PI) / 2) * Math.cos(angle)) * rib,
          ];
        };
        const shell = grid(22, 36, point);
        add(side === 1 ? shell : reverseWinding(shell), 'armor', a);
        for (let i = 1; i < 12; i++)
          add(
            tube(
              t => {
                const q = point(t, i / 12);
                q[2] += side * 0.014;
                return q;
              },
              () => 0.014,
              24,
              6,
            ),
            'accent',
            a,
          );
        add(
          tube(
            u => point(1, u),
            () => 0.031,
            40,
            7,
          ),
          'bone',
          a,
        );
      }
      add(sphere([0, 0.08, 0], [0.27, 0.12, 0.15], 10, 18), 'skin');
      break;
    }
    case 'tubecluster': {
      const count = [7, 11, 15][v];
      for (let i = 0; i < count; i++) {
        const angle = i * 2.399963229728653,
          r = i === 0 ? 0 : 0.15 + 0.3 * Math.sqrt(i / (count - 1)),
          x = Math.cos(angle) * r,
          z = Math.sin(angle) * r,
          height = 0.58 + 0.19 * Math.sin(i * 2.1),
          a = behavior('pad', { pivot: [x, 0, z], height, phase: i / count });
        add(
          tube(
            t => [x, t * height, z],
            t => 0.054 - 0.015 * t,
            12,
            8,
          ),
          'skin',
          a,
        );
        add(
          grid(8, 18, (t, u) => {
            const rad = 0.044 + t * 0.1;
            return [
              x + Math.cos(u * TAU) * rad,
              height - 0.045 + Math.sin((t * Math.PI) / 2) * 0.07,
              z + Math.sin(u * TAU) * rad,
            ];
          }),
          'accent',
          a,
        );
        add(sphere([x, height - 0.035, z], [0.05, 0.012, 0.05], 6, 10), 'dark', a, true);
      }
      break;
    }
    case 'irismouth': {
      const count = [6, 8, 10][v];
      add(
        tube(
          t => [Math.cos(t * TAU) * 0.57, 0.1, Math.sin(t * TAU) * 0.57],
          () => 0.085,
          48,
          9,
        ),
        'armor',
      );
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU,
          a = behavior('iris', {
            angle,
            pivot: [Math.cos(angle) * 0.5, 0.1, Math.sin(angle) * 0.5],
            phase: i / count,
          });
        add(
          grid(10, 8, (t, u) => {
            const r = 0.5 - t * 0.3,
              theta = angle + t * 0.52 + (((u - 0.5) * TAU) / count) * 1.25;
            return [Math.cos(theta) * r, 0.11 + 0.045 * t, Math.sin(theta) * r];
          }),
          'bone',
          a,
        );
      }
      add(sphere([0, -0.04, 0], [0.48, 0.06, 0.48], 12, 20), 'dark', 'none', true);
      break;
    }
    case 'latticecage': {
      const curve = (t, u) => {
        const angle = u * TAU,
          rad =
            v === 2
              ? 0.2 + 0.82 * (1 - Math.abs(t * 2 - 1))
              : 0.22 + 0.66 * Math.sin(t * Math.PI) * (v === 1 ? 1 + t * 0.28 : 1);
        return [Math.cos(angle) * rad, t * 1.8, Math.sin(angle) * rad];
      };
      const a = behavior('basket');
      for (let i = 0; i < 12; i++)
        for (const sign of [-1, 1])
          add(
            tube(
              t => curve(t, i / 12 + sign * t * 0.18),
              () => 0.023,
              32,
              6,
            ),
            i % 3 ? 'armor' : 'accent',
            a,
          );
      for (let j = 0; j <= 6; j++)
        add(
          tube(
            u => curve(j / 6, u),
            () => (j === 0 || j === 6 ? 0.045 : 0.019),
            40,
            6,
          ),
          'bone',
          a,
        );
      add(sphere([0, 0.88, 0], [0.24, 0.37, 0.24], 14, 20), 'glow', a);
      break;
    }
    case 'whiskerfan': {
      const count = [7, 11, 15][v];
      for (let i = 0; i < count; i++) {
        const a = (i / (count - 1) - 0.5) * 2.2,
          span = 1.25 + 0.45 * Math.sin((i / (count - 1)) * Math.PI),
          motion = behavior('whisker', { phase: i / count });
        add(
          tube(
            t => [Math.sin(a) * t * span, 0.07 + Math.cos(a) * t * span, 0.25 * t * t],
            t => 0.025 * (1 - t) + 0.003,
            26,
            6,
          ),
          i % 3 ? 'bone' : 'accent',
          motion,
        );
        if (v === 2)
          add(
            sphere(
              [Math.sin(a) * span, 0.07 + Math.cos(a) * span, 0.25],
              [0.025, 0.025, 0.025],
              6,
              8,
            ),
            'glow',
            motion,
          );
      }
      add(sphere([0, 0.03, 0], [0.21, 0.09, 0.15], 10, 14), 'skin');
      break;
    }
    case 'trunk': {
      const a = behavior('trunk'),
        span = 1.8,
        width = v === 1 ? 0.26 : 0.2;
      const curve = t => [0, t * span, 0],
        radius = t => width * (1 - 0.55 * t);
      add(tube(curve, radius, 36, 14), 'skin', a);
      for (let i = 1; i <= 9; i++) {
        const t = i / 10,
          r = radius(t) * 1.03;
        add(
          tube(
            u => [Math.cos(u * TAU) * r, t * span, Math.sin(u * TAU) * r],
            () => 0.015,
            20,
            6,
          ),
          'accent',
          a,
        );
      }
      if (v === 2)
        for (const sign of [-1, 1])
          add(
            tube(
              t => [sign * t * 0.19, span + t * 0.4, 0],
              t => 0.08 * (1 - t) + 0.012,
              14,
              9,
            ),
            'skin',
            a,
          );
      else {
        add(
          tube(
            u => [Math.cos(u * TAU) * 0.12, span, Math.sin(u * TAU) * 0.12],
            () => 0.035,
            24,
            8,
          ),
          'bone',
          a,
        );
        add(sphere([0, span - 0.018, 0], [0.1, 0.025, 0.1], 8, 12), 'dark', a, true);
      }
      break;
    }
    case 'faceplate': {
      add(
        grid(18, 24, (t, u) => {
          const x = (u - 0.5) * 1.1,
            y = (t - 0.5) * 1.2,
            edge = Math.sqrt(Math.max(0.01, 1 - Math.pow(u * 2 - 1, 2)));
          return [
            x,
            0.12 +
              0.25 * edge * Math.sin(t * Math.PI) +
              (v === 0 ? Math.max(0, 0.5 - t) * 0.55 : 0),
            y * (v === 2 ? 1.0 + 0.2 * Math.cos(u * TAU * 3) : 1),
          ];
        }),
        'armor',
      );
      for (const side of [-1, 1]) {
        add(
          sphere(
            [side * 0.22, 0.37, 0.15],
            [v === 1 ? 0.19 : 0.13, 0.023, v === 1 ? 0.035 : 0.1],
            10,
            14,
          ),
          'dark',
          'none',
          true,
        );
        add(rod([side * 0.09, 0.4, 0.3], [side * 0.42, 0.3, 0.25], 0.035), 'bone');
      }
      if (v === 2)
        for (const side of [-1, 1])
          add(
            tube(
              t => [side * (0.48 - t * 0.2), 0.12 + t * 0.04, -0.3 - t * 0.6],
              t => 0.065 * (1 - t) + 0.008,
              16,
              7,
            ),
            'accent',
          );
      break;
    }
    default:
      throw new Error('Unknown Carapace & Bloom part: ' + p.type);
  }
}
/** Prepare rigid joint frames once per segment, not once per vertex. */
export function prepareBloomMotion(a, p, time, pose = {}) {
  if (a.mode !== 'leg') return null;
  const root = scale(a.root, p),
    knee = scale(a.knee, p),
    foot = scale(a.foot, p),
    flex = p.flex * (pose.layers?.flex ?? 1),
    phase = TAU * (time * (pose.wingRate || 1) + (p.phase || 0) + a.phase),
    strength = clamp(pose.stepBank ?? 0, 0, 2) * flex;
  const target = [
    foot[0],
    foot[1] - Math.max(0, Math.sin(phase)) * 0.18 * p.size * p.length * strength,
    foot[2] + Math.cos(phase) * 0.2 * p.size * strength,
  ];
  const result = solveTwoBone(
    root,
    target,
    Math.hypot(...sub(knee, root)),
    Math.hypot(...sub(foot, knee)),
    [0, 0, 1],
  );
  return a.bone === 0
    ? { a: root, b: knee, c: root, d: result.knee }
    : { a: knee, b: foot, c: result.knee, d: result.foot };
}
export function animateBloomVertex(a, point, p, time, pose = {}, prepared = null) {
  const flex = p.flex * (pose.layers?.flex ?? 1);
  if (flex === 0) return point;
  const size = p.size,
    length = size * p.length,
    phase = TAU * (time * (pose.wingRate || 1) + (p.phase || 0) + (a.phase || 0)),
    gain = k => clamp(pose[k] ?? 0, 0, 2);
  let [x, y, z] = point;
  const hinge = (axis, angle, pivot = [0, 0, 0]) => {
    const origin = scale(pivot, p);
    return add3(rotate(sub([x, y, z], origin), axis, angle * flex), origin);
  };
  switch (a.mode) {
    case 'leg': {
      const q = prepared || prepareBloomMotion(a, p, time, pose);
      return mapSegment(point, q.a, q.b, q.c, q.d);
    }
    case 'plate':
      return hinge(
        'x',
        Math.sin(phase) * (0.035 + 0.11 * Math.max(gain('fold'), gain('stepBank'))),
        a.pivot,
      );
    case 'petal': {
      const r = Math.hypot(x, z) / Math.max(0.001, size),
        curl = (0.5 + 0.5 * Math.sin(phase)) * 0.55 * gain('bloom') * flex,
        close = 1 - curl * 0.35;
      x *= close;
      z *= close;
      y += r * r * 0.55 * curl * length;
      break;
    }
    case 'valve':
      return hinge('x', a.side * (0.12 + (0.5 + 0.5 * Math.sin(phase)) * 0.7 * gain('valve')));
    case 'pad': {
      const origin = scale(a.pivot, p),
        k = 1 - (0.5 + 0.5 * Math.sin(phase)) * 0.38 * gain('pad') * flex;
      y *= Math.max(0.25, k);
      x = origin[0] + (x - origin[0]) * (1 + (1 - k) * 0.25);
      z = origin[2] + (z - origin[2]) * (1 + (1 - k) * 0.25);
      break;
    }
    case 'iris':
      return hinge(
        'y',
        Math.sin(phase - (a.phase || 0) * TAU) *
          (0.1 + 0.4 * Math.max(gain('reach'), gain('valve'))),
        a.pivot,
      );
    case 'basket':
      return hinge('z', Math.sin(phase * 0.3) * 0.025);
    case 'whisker':
      return hinge('z', Math.sin(phase) * (0.025 + 0.19 * gain('sense')));
    case 'trunk': {
      const k = ((0.12 + 0.35 * gain('reach')) * Math.sin(phase) * flex) / Math.max(0.001, length),
        angle = y * k;
      if (Math.abs(k) > 0.00001) {
        x = x * Math.cos(angle) + (1 - Math.cos(angle)) / k;
        y = Math.sin(angle) / k - point[0] * Math.sin(angle);
      }
      z += Math.sin(phase * 0.5 - y / Math.max(0.001, length)) * y * 0.04 * gain('reach') * flex;
      break;
    }
  }
  return [x, y, z];
}

/** Conservative rest-foot samples for the stabilized ground controller.
 * These points set a fixed clearance only. They are not contacts or colliders.
 */
export function bloomSupportPoints(p) {
  let points = [];
  if (p.type === 'legbank')
    points = Array.from({ length: 3 + p.variant }, (_, i) => [
      0,
      0.84,
      (i / (2 + p.variant) - 0.5) * 1.9 - 0.1,
    ]);
  if (p.type === 'tubecluster')
    points = Array.from({ length: [7, 11, 15][p.variant] }, (_, i) => {
      const count = [7, 11, 15][p.variant],
        a = i * 2.399963229728653,
        r = i === 0 ? 0 : 0.15 + 0.3 * Math.sqrt(i / (count - 1));
      return [Math.cos(a) * r, 0.58 + 0.19 * Math.sin(i * 2.1) + 0.025, Math.sin(a) * r];
    });
  return points.map(v => scale(v, p).map((n, i) => (i === 0 && p.mirrorSide === -1 ? -n : n)));
}
