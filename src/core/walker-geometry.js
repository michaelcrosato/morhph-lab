/** Original walker leg: one geometry plan for diagnostic poses and terrain IK.
 * Joint positions are supplied by the caller. This module does not probe terrain.
 */
import { sphere, tube, meshNormals } from './parametric-mesh.js';
import { solveTwoBone } from './ik.js';
import { rotateY, smooth } from './math.js';
const Y = [0, 1, 0],
  cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
function fromY(q, d) {
  const len = Math.hypot(...d);
  if (len < 1e-12) return [0, 0, 0];
  const n = d.map(x => x / len);
  if (n[1] < -0.999999) return [q[0], -q[1], -q[2]];
  const axis = [n[2], 0, -n[0]],
    w = 1 + n[1],
    norm = Math.hypot(...axis, w),
    v = axis.map(x => x / norm),
    t = cross(v, q).map(x => x * 2);
  const k = cross(v, t);
  return q.map((x, i) => x + (w / norm) * t[i] + k[i]);
}
export function walkerDimensions(p) {
  return {
    upperLength: 0.72 * p.size * p.length,
    lowerLength: 0.66 * p.size * p.length,
    radius: 0.14 * p.size,
  };
}
export function compileWalker(part) {
  const p = {
      variant: 0,
      size: 1,
      length: 1,
      flex: 1,
      phase: 0,
      side: 1,
      mirrorSide: 1,
      twist: 0,
      pair: 0,
      material: 'inherit',
      ...part,
    },
    dim = walkerDimensions(p),
    pieces = [];
  const add = (data, material, bind) =>
    pieces.push({ ...data, material: p.material === 'inherit' ? material : p.material, bind });
  const ball = sphere([0, 0, 0], [1, 1, 1], 12, 20),
    cylinder = tube(
      t => [0, t, 0],
      () => 1,
      1,
      12,
    );
  add(cylinder, 'skin', { type: 'segment', a: 'hip', b: 'knee', radius: dim.radius });
  add(cylinder, 'skin', { type: 'segment', a: 'knee', b: 'foot', radius: dim.radius * 0.72 });
  for (const [joint, scale] of [
    ['hip', 1.28],
    ['knee', 1.03],
    ['foot', 0.75],
  ])
    add(ball, 'skin', { type: 'joint', joint, scale: scale * dim.radius });
  add(
    sphere(
      [0, 0, 0.1 * p.size],
      [(0.21 + p.variant * 0.05) * p.size, 0.12 * p.size, (0.32 + p.variant * 0.04) * p.size],
      12,
      20,
    ),
    'skin',
    { type: 'foot' },
  );
  for (let i = -1; i <= 1; i++)
    add(
      tube(
        t => [i * 0.115 * p.size, -0.015 * p.size, (0.23 + t * 0.24) * p.size],
        t => 0.065 * p.size * (1 - t) + 0.001,
        4,
        10,
      ),
      'accent',
      { type: 'foot' },
    );
  const groups = new Map();
  for (const piece of pieces) {
    if (!groups.has(piece.material)) groups.set(piece.material, []);
    groups.get(piece.material).push(piece);
  }
  const components = [...groups].map(([material, list]) => {
    const count = list.reduce((n, x) => n + x.positions.length, 0),
      positions = new Float32Array(count),
      uvs = new Float32Array((count / 3) * 2),
      ids = [],
      segments = [];
    let off = 0;
    for (const x of list) {
      positions.set(x.positions, off);
      uvs.set(x.uvs, (off / 3) * 2);
      for (const id of x.indices) ids.push(id + off / 3);
      segments.push({ start: off, count: x.positions.length, bind: x.bind });
      off += x.positions.length;
    }
    const indices = new Uint32Array(ids);
    return {
      name: 'leg/' + material,
      material,
      positions,
      uvs,
      indices,
      normals: meshNormals(positions, indices),
      segments,
    };
  });
  return { kind: 'walker', type: 'leg', part: p, dimensions: dim, components, version: 1 };
}
export function sampleWalker(plan, joints = null, reuse = null) {
  const p = plan.part,
    d = plan.dimensions,
    j = joints || {
      hip: [0, 0, 0],
      knee: [0, -d.upperLength, 0],
      foot: [0, -d.upperLength - d.lowerLength, 0],
      footYaw: 0,
    };
  for (const name of ['hip', 'knee', 'foot'])
    if (!j[name] || j[name].length !== 3 || !j[name].every(Number.isFinite))
      throw new Error('Walker ' + name + ' must be finite.');
  if (!Number.isFinite(j.footYaw ?? 0)) throw new Error('Walker foot angle must be finite.');
  return plan.components.map((c, ci) => {
    const positions =
        reuse?.[ci]?.positions?.length === c.positions.length
          ? reuse[ci].positions
          : new Float32Array(c.positions.length),
      normals =
        reuse?.[ci]?.normals?.length === c.positions.length
          ? reuse[ci].normals
          : new Float32Array(c.positions.length);
    for (const s of c.segments) {
      const b = s.bind;
      for (let k = s.start; k < s.start + s.count; k += 3) {
        let q = Array.from(c.positions.subarray(k, k + 3));
        if (b.type === 'segment') {
          const a = j[b.a],
            delta = j[b.b].map((v, i) => v - a[i]),
            length = Math.hypot(...delta);
          q = fromY([q[0] * b.radius, q[1] * length, q[2] * b.radius], delta).map(
            (v, i) => v + a[i],
          );
        } else if (b.type === 'joint') q = q.map((v, i) => v * b.scale + j[b.joint][i]);
        else q = rotateY(q, j.footYaw ?? 0).map((v, i) => v + j.foot[i]);
        positions.set(q, k);
      }
    }
    meshNormals(positions, c.indices, normals);
    return {
      name: c.name,
      material: c.material,
      positions,
      normals,
      indices: c.indices,
      uvs: c.uvs,
      kind: 'walker-part',
    };
  });
}
/** Same preview foot target used by the runtime and offline compiler. */
export function walkerPreviewTarget(
  p,
  pose,
  { gait = 0, restHeight = 0, hip = p.position, afloat = false, moving = false } = {},
) {
  const d = walkerDimensions(p);
  if (afloat)
    return [hip[0] + p.side * 0.13, hip[1] - 0.65 * d.upperLength, hip[2] - 0.35 * d.lowerLength];
  const target = [
    p.position[0] + p.side * 0.27 * p.size,
    -restHeight + 0.12 * p.size,
    p.position[2] + 0.08,
  ];
  if (moving) {
    const phase =
        (((gait + (p.pair % 2) * pose.phaseLag + (p.side < 0 ? 0.5 : 0) + (p.phase ?? 0)) % 1) +
          1) %
        1,
      swing = phase > pose.stance,
      t = swing ? (phase - pose.stance) / (1 - pose.stance) : phase / pose.stance,
      step = swing ? -0.5 + smooth(t) : 0.5 - t;
    target[2] += step * pose.stride * p.length * p.flex;
    target[0] += step * pose.lateral * p.length * p.flex;
    target[1] += swing ? Math.sin(t * Math.PI) * pose.lift * p.flex : 0;
  }
  return target;
}
export function solveWalker(p, hip, target) {
  const d = walkerDimensions(p),
    r = solveTwoBone(
      hip,
      target,
      d.upperLength,
      d.lowerLength,
      rotateY([p.side * 0.5, 0, 0.85], p.twist * p.mirrorSide),
    );
  return {
    hip,
    knee: r.knee,
    foot: r.foot,
    footYaw: p.side * 0.1 + p.twist * p.mirrorSide,
    error: r.error,
  };
}
