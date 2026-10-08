import { FIELD_PATTERNS, FIELD_MICRO, FIELD_SURFACES, fieldMicroHeight } from './field-surfaces.js';
import { BLOOM_PATTERNS, BLOOM_MICRO, BLOOM_SURFACES, bloomMicroHeight } from './bloom-surfaces.js';
import {
  FRONTIER_PATTERNS,
  FRONTIER_MICRO,
  FRONTIER_SURFACES,
  frontierMicroHeight,
} from './frontier-surfaces.js';
import { TIDAL_PATTERNS, TIDAL_MICRO, TIDAL_SURFACES } from './tidal-surfaces.js';
import { rng } from './math.js';
export const PATTERNS = Object.freeze([
  'plain',
  'spots',
  'stripes',
  'scales',
  'cells',
  'marble',
  'rings',
  'speckle',
  'chevron',
  'cracks',
  'rosettes',
  'mottled',
  'veins',
  'weave',
  'lattice',
  'woodgrain',
  'circuit',
  'patches',
  ...TIDAL_PATTERNS,
  ...FRONTIER_PATTERNS,
  ...BLOOM_PATTERNS,
  ...FIELD_PATTERNS,
]);
export const MICRO_SURFACES = Object.freeze([
  'pores',
  'scales',
  'ridges',
  'pebbles',
  'weave',
  'brushed',
  'bark',
  'pitted',
  'hex',
  'leather',
  ...TIDAL_MICRO,
  ...FRONTIER_MICRO,
  ...BLOOM_MICRO,
  ...FIELD_MICRO,
]);
export const SURFACE_PRESETS = Object.freeze({
  ...TIDAL_SURFACES,
  ...FRONTIER_SURFACES,
  ...BLOOM_SURFACES,
  ...FIELD_SURFACES,
  linen: {
    label: 'Linen',
    pattern: 'weave',
    roughness: 0.96,
    metalness: 0,
    relief: 0.028,
    micro: 'weave',
    emission: 0,
  },
  leather: {
    label: 'Leather',
    pattern: 'mottled',
    roughness: 0.77,
    metalness: 0,
    relief: 0.042,
    micro: 'leather',
    emission: 0,
  },
  iron: {
    label: 'Brushed iron',
    pattern: 'plain',
    roughness: 0.42,
    metalness: 0.88,
    relief: 0.018,
    micro: 'brushed',
    emission: 0,
  },
  bronze: {
    label: 'Aged bronze',
    pattern: 'patches',
    roughness: 0.6,
    metalness: 0.72,
    relief: 0.028,
    micro: 'pitted',
    emission: 0,
  },
  bark: {
    label: 'Bark',
    pattern: 'woodgrain',
    roughness: 0.92,
    metalness: 0,
    relief: 0.085,
    micro: 'bark',
    emission: 0,
  },
  porcelain: {
    label: 'Porcelain',
    pattern: 'veins',
    roughness: 0.22,
    metalness: 0.06,
    relief: 0.008,
    micro: 'pores',
    emission: 0,
  },
  biofiber: {
    label: 'Biofiber',
    pattern: 'lattice',
    roughness: 0.52,
    metalness: 0.08,
    relief: 0.045,
    micro: 'hex',
    emission: 0.12,
  },
  circuit: {
    label: 'Circuit',
    pattern: 'circuit',
    roughness: 0.38,
    metalness: 0.48,
    relief: 0.022,
    micro: 'brushed',
    emission: 0.65,
  },
  velvet: {
    label: 'Velvet',
    pattern: 'plain',
    roughness: 0.93,
    metalness: 0,
    relief: 0.012,
    micro: 'pores',
    emission: 0,
  },
  reptile: {
    label: 'Reptile',
    pattern: 'scales',
    roughness: 0.53,
    metalness: 0.02,
    relief: 0.05,
    micro: 'scales',
    emission: 0,
  },
  chitin: {
    label: 'Chitin',
    pattern: 'cells',
    roughness: 0.32,
    metalness: 0.2,
    relief: 0.035,
    micro: 'ridges',
    emission: 0,
  },
  stone: {
    label: 'Stone',
    pattern: 'cracks',
    roughness: 0.92,
    metalness: 0,
    relief: 0.09,
    micro: 'pebbles',
    emission: 0,
  },
  coral: {
    label: 'Coral',
    pattern: 'rings',
    roughness: 0.67,
    metalness: 0,
    relief: 0.075,
    micro: 'pores',
    emission: 0,
  },
  luminous: {
    label: 'Luminous',
    pattern: 'marble',
    roughness: 0.35,
    metalness: 0.08,
    relief: 0.02,
    micro: 'pores',
    emission: 0.65,
  },
});
export function appearanceLayers(a) {
  return [
    {
      pattern: a.pattern,
      scale: a.patternScale,
      weight: a.weight ?? 1,
      angle: a.angle ?? 0,
      warp: a.warp ?? 0.45,
    },
    ...(a.layers || []),
  ];
}
export function setAppearanceLayer(a, index, layer) {
  if (index === 0) {
    a.pattern = layer.pattern;
    a.patternScale = layer.scale;
    a.weight = layer.weight;
    a.angle = layer.angle;
    a.warp = layer.warp;
  } else a.layers[index - 1] = { ...layer };
}
/** Deterministic tileable height data. No DOM, images, or renderer dependency. */
export function generateMicroTexture(seed, style = 'pores', size = 128) {
  if (!MICRO_SURFACES.includes(style) || !Number.isInteger(size) || size < 8 || size > 512)
    throw new Error('Invalid microtexture request.');
  const r = rng(seed),
    data = new Uint8Array(size * size * 4),
    tau = Math.PI * 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        noise = r(),
        wave = Math.sin(u * tau * 8) * Math.cos(v * tau * 8);
      let h = 0.55 + noise * 0.32;
      if (style === 'scales') {
        const row = Math.floor(v * 8),
          px = ((u * 8 + (row % 2) * 0.5) % 1) - 0.5,
          py = ((v * 8) % 1) - 0.5;
        h = 0.28 + 0.62 * Math.max(0, 1 - Math.hypot(px * 1.7, py * 1.5));
      }
      if (style === 'ridges')
        h =
          0.32 +
          0.48 * (Math.sin((u * 8 + Math.sin(v * tau) * 0.35) * tau) * 0.5 + 0.5) +
          noise * 0.08;
      if (style === 'pebbles') h = 0.38 + 0.32 * wave + noise * 0.12;
      if (style === 'weave') {
        const a = Math.sin(u * tau * 16),
          b = Math.sin(v * tau * 16);
        h = 0.38 + 0.2 * a + 0.16 * b + 0.08 * a * b;
      }
      if (style === 'brushed')
        h = 0.48 + 0.17 * Math.sin(u * tau * 48) + 0.05 * Math.sin(v * tau * 2) + noise * 0.035;
      if (style === 'bark')
        h =
          0.42 +
          0.2 * Math.sin(u * tau * 12 + Math.sin(v * tau * 2) * 1.4) +
          0.1 * Math.cos(u * tau * 28 + v * tau * 2);
      if (style === 'pitted') {
        const px = Math.sin(u * tau * 8),
          py = Math.sin(v * tau * 8);
        h = 0.68 - 0.38 * Math.pow(Math.max(0, px * py), 8) + noise * 0.05;
      }
      if (style === 'hex') {
        const row = Math.floor(v * 8),
          px = ((u * 8 + (row % 2) * 0.5) % 1) - 0.5,
          py = ((v * 8) % 1) - 0.5;
        h =
          0.3 +
          0.5 *
            Math.max(0, 1 - Math.max(Math.abs(px) * 1.9, Math.abs(py) * 1.7 + Math.abs(px) * 0.5));
      }
      if (style === 'leather')
        h = 0.48 + 0.13 * wave + 0.1 * Math.sin((u + v) * tau * 24) + noise * 0.13;
      if (style === 'denticles') {
        const row = Math.floor(v * 16),
          px = ((u * 16 + (row % 2) * 0.5) % 1) - 0.5,
          py = ((v * 16) % 1) - 0.5;
        h = 0.35 + 0.42 * Math.max(0, 1 - Math.abs(px) * 2 - Math.abs(py) * 1.5);
      }
      if (style === 'feather')
        h =
          0.4 +
          0.12 * Math.sin(u * tau * 24) +
          0.24 * Math.sin((v * 32 + Math.abs(Math.sin(u * tau * 4)) * 0.55) * tau);
      if (style === 'down')
        h =
          0.5 +
          0.12 * Math.sin(u * tau * 23 + Math.sin(v * tau * 7)) +
          0.12 * Math.cos(v * tau * 29 + Math.sin(u * tau * 5)) +
          noise * 0.09;
      if (style === 'lamellae')
        h =
          0.44 + 0.25 * Math.pow(Math.sin((u * 16 + Math.sin(v * tau) * 0.3) * tau) * 0.5 + 0.5, 3);
      if (style === 'growthrings')
        h =
          0.45 +
          0.22 * Math.sin((u * 12 + Math.sin(v * tau) * 0.35) * tau) +
          0.07 * Math.sin(v * tau * 4);
      if (style === 'wingmesh') {
        const a = Math.abs(Math.sin(u * tau * 12)),
          b = Math.abs(Math.sin((v * 12 + u * 6) * tau));
        h = 0.35 + 0.45 * (1 - Math.min(a, b));
      }
      h =
        fieldMicroHeight(style, u, v, noise) ??
        bloomMicroHeight(style, u, v, noise) ??
        frontierMicroHeight(style, u, v, noise) ??
        h;
      const value = Math.max(0, Math.min(255, Math.round(h * 255)));
      data.set([value, value, value, 255], (y * size + x) * 4);
    }
  return data;
}
