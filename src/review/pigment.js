import { fieldPattern } from '../core/field-surfaces.js';
import { bloomPattern } from '../core/bloom-surfaces.js';
import { frontierPattern } from '../core/frontier-surfaces.js';
import { appearanceLayers } from '../core/surfaces.js';
const fract = x => x - Math.floor(x),
  mix = (a, b, t) => a + (b - a) * t,
  ss = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
const hash = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
export function reviewNoise(p) {
  const i = p.map(Math.floor),
    f = p.map(fract).map(x => x * x * (3 - 2 * x));
  const h = (x, y, z) => hash(i[0] + x, i[1] + y, i[2] + z);
  return mix(
    mix(mix(h(0, 0, 0), h(1, 0, 0), f[0]), mix(h(0, 1, 0), h(1, 1, 0), f[0]), f[1]),
    mix(mix(h(0, 0, 1), h(1, 0, 1), f[0]), mix(h(0, 1, 1), h(1, 1, 1), f[0]), f[1]),
    f[2],
  );
}
/** CPU pigment samples follow the shader equations. Vertex interpolation, noise
 * precision, lighting and color space differ. This is NOT a GPU material test. */
export function reviewPattern(pattern, point, warp = 0) {
  if (pattern === 'plain') return 0;
  const noise = (p, s = 1) => reviewNoise(p.map(v => v * s)),
    n = noise(point, 0.7),
    p = point.map(v => v + (n - 0.5) * warp),
    [x, y, z] = p;
  switch (pattern) {
    case 'spots':
      return ss(0.6, 0.73, noise(p));
    case 'stripes':
      return ss(0.53, 0.78, Math.sin(z * 2.5 + n * 4) * 0.5 + 0.5);
    case 'scales':
      return ss(
        0.32,
        0.47,
        Math.hypot(fract(x + (((Math.floor(z) % 2) + 2) % 2) * 0.5) - 0.5, fract(z) - 0.5),
      );
    case 'cells':
      return 1 - ss(0.015, 0.1, Math.min(...p.map(v => Math.abs(fract(v) - 0.5))));
    case 'marble':
      return ss(0.3, 0.75, Math.sin(z * 2 + noise(p, 0.45) * 9) * 0.5 + 0.5);
    case 'rings':
      return ss(0.55, 0.8, Math.sin(Math.hypot(x, z) * 5 + n * 2) * 0.5 + 0.5);
    case 'speckle':
      return ss(0.66, 0.8, noise(p, 3));
    case 'chevron':
      return ss(0.5, 0.75, Math.sin((z + Math.abs(x)) * 3) * 0.5 + 0.5);
    case 'cracks':
      return 1 - ss(0.015, 0.06, Math.abs(noise(p) - 0.5));
    case 'rosettes': {
      const d = Math.hypot(fract(x) - 0.5, fract(z) - 0.5);
      return ss(0.2, 0.28, d) * (1 - ss(0.35, 0.43, d));
    }
    case 'mottled':
      return ss(0.32, 0.72, noise(p, 0.55) * 0.7 + noise(p, 2) * 0.3);
    case 'veins':
      return 1 - ss(0.025, 0.1, Math.abs(Math.sin(x * 1.7 + noise(p, 0.45) * 5)));
    case 'weave':
      return ss(
        0.32,
        0.75,
        Math.max(Math.abs(Math.sin(x * 6.28318)), Math.abs(Math.sin(z * 6.28318))) * 0.85,
      );
    case 'lattice':
      return 1 - ss(0.05, 0.13, Math.min(Math.abs(fract(x) - 0.5), Math.abs(fract(z) - 0.5)));
    case 'woodgrain':
      return ss(0.35, 0.8, Math.sin(x * 5 + noise(p, 0.35) * 7 + y * 0.35) * 0.5 + 0.5);
    case 'circuit':
      return (
        1 -
        ss(
          0.03,
          0.075,
          Math.min(
            Math.abs(fract(x) - 0.5),
            Math.abs(fract(z) - ((((Math.floor(x) + Math.floor(z)) % 2) + 2) % 2 ? 0.75 : 0.25)),
          ),
        )
      );
    case 'patches':
      return ss(0.46, 0.6, noise(p, 0.4));
    case 'cycloid':
      return (
        1 -
        ss(
          0.02,
          0.09,
          Math.abs(
            Math.hypot(
              fract(x + (((Math.floor(z) % 2) + 2) % 2) * 0.5) - 0.5,
              (fract(z) - 0.5) * 0.72,
            ) - 0.39,
          ),
        )
      );
    case 'chromatophore':
      return ss(0.32, 0.64, noise(p, 0.42) * 0.6 + noise(p, 1.9) * 0.4);
    case 'featherbarbs':
      return Math.max(
        1 - ss(0.025, 0.065, Math.abs(fract(x) - 0.5)),
        (1 - ss(0.035, 0.11, Math.abs(Math.sin((z + Math.abs(fract(x) - 0.5) * 1.8) * 8)))) * 0.74,
      );
    case 'eyespots': {
      const d = Math.hypot(fract(x * 0.48) - 0.5, (fract(z * 0.48) - 0.5) * 1.2);
      return Math.max(ss(0.19, 0.235, d) * (1 - ss(0.31, 0.36, d)), (1 - ss(0.08, 0.14, d)) * 0.75);
    }
    case 'lightrows':
      return (
        (1 - ss(0.09, 0.18, Math.hypot(fract(z * 1.6) - 0.5, fract(y * 0.7) - 0.5))) *
        (0.65 + 0.35 * Math.sin(x * 0.5))
      );
    case 'shellgrowth':
      return ss(0.4, 0.7, Math.sin(Math.hypot(x, y) * 7.5 + Math.atan2(y, x) * 1.7) * 0.5 + 0.5);
    case 'wingveins':
      return Math.max(
        1 - ss(0.03, 0.09, Math.abs(z - Math.sin(y * 0.35) * 0.3)),
        1 - ss(0.04, 0.13, Math.abs(Math.sin(y * 2.5 + Math.abs(z) * 2))),
      );
    case 'currentbands':
      return ss(
        0.38,
        0.72,
        Math.sin(z * 2.1 + Math.sin(x * 0.7) * 2.2 + Math.sin(y * 0.9)) * 0.5 + 0.5,
      );
    default: {
      const value =
        fieldPattern(pattern, p, reviewNoise) ??
        bloomPattern(pattern, p, reviewNoise) ??
        frontierPattern(pattern, p, reviewNoise);
      if (value !== undefined) return value;
      throw new Error('Unknown CPU pigment: ' + pattern);
    }
  }
}
export function sampleReviewPigment(a, position, base) {
  let total = 0,
    value = 0;
  const seed = ((a.textureSeed % 997) / 997) * 10;
  for (const l of appearanceLayers(a)) {
    if (!l.weight) continue;
    const p = Array.from(position, v => v * l.scale),
      c = Math.cos(l.angle),
      s = Math.sin(l.angle),
      x = p[0],
      z = p[2];
    p[0] = c * x + s * z + seed;
    p[1] += seed;
    p[2] = -s * x + c * z + seed;
    value += reviewPattern(l.pattern, p, l.warp) * l.weight;
    total += l.weight;
  }
  const t = (value / Math.max(1, total)) * a.strength,
    accent = [1, 3, 5].map(i => parseInt(a.accent.slice(i, i + 2), 16));
  return base.map((v, i) => mix(v, accent[i], t));
}
