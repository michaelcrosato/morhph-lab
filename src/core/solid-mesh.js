/** Small solid shapes for shared, engine-free part factories. */
import { grid, merge, reverseWinding } from './parametric-mesh.js';
export function box(center, size) {
  const faces = [];
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const a = (axis + 1) % 3,
        b = (axis + 2) % 3;
      let face = grid(1, 1, (v, u) => {
        const p = [...center];
        p[axis] += (sign * size[axis]) / 2;
        p[a] += (u - 0.5) * size[a];
        p[b] += (v - 0.5) * size[b];
        return p;
      });
      if (sign < 0) face = reverseWinding(face);
      faces.push(face);
    }
  return merge(faces);
}
/** Extrude a convex 2D outline around local Z. Concave outlines are not accepted. */
export function prism(points, depth = 0.06) {
  const pos = [],
    uv = [],
    idx = [];
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    area += a[0] * b[1] - a[1] * b[0];
  }
  const pts = area < 0 ? [...points].reverse() : points;
  const tri = (a, b, c) => {
    const k = pos.length / 3;
    pos.push(...a, ...b, ...c);
    uv.push(0, 0, 1, 0, 0, 1);
    idx.push(k, k + 1, k + 2);
  };
  for (const sign of [-1, 1])
    for (let i = 1; i < pts.length - 1; i++) {
      const a = [...pts[0], (sign * depth) / 2],
        b = [...pts[i], (sign * depth) / 2],
        c = [...pts[i + 1], (sign * depth) / 2];
      sign > 0 ? tri(a, b, c) : tri(a, c, b);
    }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length],
      q = [...a, -depth / 2],
      r = [...b, -depth / 2],
      s = [...a, depth / 2],
      t = [...b, depth / 2];
    tri(q, r, s);
    tri(r, t, s);
  }
  return {
    positions: new Float32Array(pos),
    uvs: new Float32Array(uv),
    indices: new Uint32Array(idx),
  };
}
