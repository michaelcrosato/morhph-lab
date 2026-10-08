/** Indexed procedural mesh helpers. No DOM, image, or renderer dependency. */
const TAU = Math.PI * 2;
const add = (a, b) => a.map((v, i) => v + b[i]),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  mul = (a, s) => a.map(v => v * s);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = v => {
  const n = Math.hypot(...v) || 1;
  return v.map(x => x / n);
};
export function meshNormals(positions, indices, out = new Float32Array(positions.length)) {
  out.fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3,
      b = indices[i + 1] * 3,
      c = indices[i + 2] * 3,
      ab = [
        positions[b] - positions[a],
        positions[b + 1] - positions[a + 1],
        positions[b + 2] - positions[a + 2],
      ],
      ac = [
        positions[c] - positions[a],
        positions[c + 1] - positions[a + 1],
        positions[c + 2] - positions[a + 2],
      ],
      n = cross(ab, ac);
    for (const k of [a, b, c]) for (let j = 0; j < 3; j++) out[k + j] += n[j];
  }
  for (let i = 0; i < out.length; i += 3) {
    const n = Math.hypot(out[i], out[i + 1], out[i + 2]);
    if (n > 1e-15) {
      out[i] /= n;
      out[i + 1] /= n;
      out[i + 2] /= n;
    } else out[i + 1] = 1;
  }
  return out;
}
export function grid(rows, cols, point) {
  const positions = [],
    indices = [],
    uvs = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      positions.push(...point(r / rows, c / cols));
      uvs.push(c / cols, r / rows);
    }
  const tri = (a, b, c) => {
    const p = positions.slice(a * 3, a * 3 + 3),
      q = positions.slice(b * 3, b * 3 + 3),
      s = positions.slice(c * 3, c * 3 + 3);
    if (Math.hypot(...cross(sub(q, p), sub(s, p))) > 1e-10) indices.push(a, b, c);
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c,
        b = a + cols + 1;
      tri(a, a + 1, b);
      tri(a + 1, b + 1, b);
    }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    uvs: new Float32Array(uvs),
  };
}
export function sphere(center, scale, rows = 12, cols = 20) {
  return grid(rows, cols, (v, u) => [
    center[0] + Math.sin(v * Math.PI) * Math.cos(u * TAU) * scale[0],
    center[1] + Math.cos(v * Math.PI) * scale[1],
    center[2] + Math.sin(v * Math.PI) * Math.sin(u * TAU) * scale[2],
  ]);
}
export function tube(curve, radius, steps = 26, sides = 8) {
  return grid(steps, sides, (v, u) => {
    const p = curve(v),
      d = unit(sub(curve(Math.min(1, v + 0.001)), curve(Math.max(0, v - 0.001)))),
      axis = Math.abs(d[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0],
      a = unit(cross(d, axis)),
      b = unit(cross(d, a)),
      r = radius(v),
      angle = u * TAU;
    return p.map((x, i) => x + r * (a[i] * Math.cos(angle) + b[i] * Math.sin(angle)));
  });
}
export function rod(a, b, r = 0.025) {
  return tube(
    t => a.map((v, i) => v + (b[i] - v) * t),
    () => r,
    2,
    6,
  );
}
export function foil(span, chord, variant = 0) {
  return grid(18, 12, (v, u) => {
    const width = chord * Math.pow(Math.max(0.001, Math.sin(v * Math.PI)), 0.55) * (1 - 0.27 * v),
      sweep = (variant === 1 ? 0.35 : 0.12) * v * v,
      edge = (u - 0.5) * 2;
    return [
      0.04 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI),
      v * span,
      edge * width - sweep + (variant === 2 ? Math.sin(v * 10) * 0.035 : 0),
    ];
  });
}
export function translated(data, offset) {
  const p = new Float32Array(data.positions);
  for (let i = 0; i < p.length; i++) p[i] += offset[i % 3];
  return { ...data, positions: p };
}
export function rotated(data, axis, angle) {
  const p = new Float32Array(data.positions);
  for (let i = 0; i < p.length; i += 3) p.set(rotate(p.subarray(i, i + 3), axis, angle), i);
  return { ...data, positions: p };
}
export function rotate(p, axis, a) {
  const c = Math.cos(a),
    s = Math.sin(a),
    [x, y, z] = p;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}
export function merge(items) {
  let count = 0;
  const pos = [],
    uv = [],
    idx = [];
  for (const d of items) {
    pos.push(...d.positions);
    uv.push(...d.uvs);
    for (const i of d.indices) idx.push(i + count);
    count += d.positions.length / 3;
  }
  return {
    positions: new Float32Array(pos),
    uvs: new Float32Array(uv),
    indices: new Uint32Array(idx),
  };
}

/** Reverse triangle winding without changing the input arrays. */
export function reverseWinding(data) {
  const indices = new Uint32Array(data.indices);
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  return { ...data, indices };
}
