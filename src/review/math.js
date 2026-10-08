import { sub, cross, dot } from '../core/math.js';
/** Small column-major affine math module for portable geometry inspection. */
export const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function multiply(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
export function quaternion([x = 0, y = 0, z = 0]) {
  const a = Math.cos(x / 2),
    b = Math.cos(y / 2),
    c = Math.cos(z / 2),
    d = Math.sin(x / 2),
    e = Math.sin(y / 2),
    f = Math.sin(z / 2);
  return [
    d * b * c + a * e * f,
    a * e * c - d * b * f,
    a * b * f + d * e * c,
    a * b * c - d * e * f,
  ];
}
export function slerp(a, b, t) {
  let dot = a.reduce((s, v, i) => s + v * b[i], 0);
  if (dot < 0) {
    b = b.map(x => -x);
    dot = -dot;
  }
  if (dot > 0.9995) {
    const r = a.map((x, i) => x + (b[i] - x) * t),
      d = Math.hypot(...r);
    return r.map(x => x / d);
  }
  const th = Math.acos(Math.min(1, dot)),
    s = Math.sin(th);
  return a.map((x, i) => (x * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
}
export function compose(p = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q,
    xx = x * x,
    yy = y * y,
    zz = z * z,
    xy = x * y,
    xz = x * z,
    yz = y * z,
    wx = w * x,
    wy = w * y,
    wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0],
    2 * (xy + wz) * s[0],
    2 * (xz - wy) * s[0],
    0,
    2 * (xy - wz) * s[1],
    (1 - 2 * (xx + zz)) * s[1],
    2 * (yz + wx) * s[1],
    0,
    2 * (xz + wy) * s[2],
    2 * (yz - wx) * s[2],
    (1 - 2 * (xx + yy)) * s[2],
    0,
    ...p,
    1,
  ];
}
export const transform = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
export const normalize = v => {
  const d = Math.hypot(...v);
  return d > 1e-12 ? v.map(x => x / d) : [0, 1, 0];
};
export { sub, cross, dot };
export function normalTransform(m, n) {
  const a = [m[0], m[1], m[2]],
    b = [m[4], m[5], m[6]],
    c = [m[8], m[9], m[10]],
    bc = cross(b, c),
    ca = cross(c, a),
    ab = cross(a, b),
    det = dot(a, bc);
  if (Math.abs(det) < 1e-12) return [0, 1, 0];
  return normalize(bc.map((v, i) => (v * n[0] + ca[i] * n[1] + ab[i] * n[2]) / det));
}
export function faceNormals(positions, indices) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i],
      b = indices[i + 1],
      c = indices[i + 2],
      p = positions.slice(a * 3, a * 3 + 3),
      q = positions.slice(b * 3, b * 3 + 3),
      r = positions.slice(c * 3, c * 3 + 3),
      n = cross(sub(q, p), sub(r, p));
    for (const id of [a, b, c]) for (let k = 0; k < 3; k++) out[id * 3 + k] += n[k];
  }
  for (let i = 0; i < out.length; i += 3) out.set(normalize(out.slice(i, i + 3)), i);
  return out;
}
