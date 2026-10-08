import { FIELD_PATTERN_GLSL } from './field-surfaces.js';
/** Pigment masks and tileable height functions. No image assets. */
export const BLOOM_PATTERNS = Object.freeze([
  'scuteedges',
  'petalveins',
  'pollen',
  'saddle',
  'stitchgrid',
  'oxidation',
  'maze',
  'growthbands',
]);
export const BLOOM_MICRO = Object.freeze([
  'scutes',
  'petalgrain',
  'suction',
  'ribcloth',
  'gravel',
  'hammered',
]);
const recipe = (label, pattern, roughness, metalness, relief, micro, emission = 0) => ({
  label,
  pattern,
  roughness,
  metalness,
  relief,
  micro,
  emission,
});
export const BLOOM_SURFACES = Object.freeze({
  scutearmor: recipe('Scute armor', 'scuteedges', 0.54, 0.08, 0.06, 'scutes'),
  petalwax: recipe('Petal wax', 'petalveins', 0.38, 0.01, 0.026, 'petalgrain'),
  pollendust: recipe('Pollen dust', 'pollen', 0.94, 0, 0.035, 'gravel'),
  saddlehide: recipe('Saddle hide', 'saddle', 0.75, 0, 0.045, 'scutes'),
  fieldcloth: recipe('Field cloth', 'stitchgrid', 0.95, 0, 0.028, 'ribcloth'),
  oxidized: recipe('Oxidized plate', 'oxidation', 0.68, 0.55, 0.041, 'hammered'),
  mazeenamel: recipe('Maze enamel', 'maze', 0.27, 0.2, 0.025, 'hammered', 0.18),
  growthshell: recipe('Growth shell', 'growthbands', 0.46, 0.1, 0.042, 'suction'),
});
const fract = x => x - Math.floor(x),
  ss = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
export function bloomPattern(name, [x, y, z], noise) {
  switch (name) {
    case 'scuteedges': {
      const u = fract(x * 0.8 + Math.floor(z * 0.8) * 0.5) - 0.5,
        v = fract(z * 0.8) - 0.5;
      return (
        1 -
        ss(
          0.025,
          0.1,
          Math.abs(Math.max(Math.abs(u) * 0.85, Math.abs(v) + Math.abs(u) * 0.35) - 0.4),
        )
      );
    }
    case 'petalveins':
      return Math.max(
        1 - ss(0.03, 0.08, Math.abs(x)),
        (1 - ss(0.02, 0.08, Math.abs(Math.sin(z * 4 - Math.abs(x) * 5)))) * 0.68,
      );
    case 'pollen':
      return Math.max(
        ss(0.66, 0.8, noise([x * 5, y * 5, z * 5])),
        ss(0.6, 0.74, noise([x * 0.8, y * 0.8, z * 0.8])) * 0.3,
      );
    case 'saddle':
      return (
        ss(0.25, 0.65, Math.cos(z * 1.8) * 0.5 + 0.5) *
        (1 - ss(0.15, 0.65, Math.abs(Math.sin(x * 0.7 + y * 0.4))))
      );
    case 'stitchgrid': {
      const u = fract(x) - 0.5,
        v = fract(z) - 0.5,
        line = 1 - ss(0.018, 0.065, Math.min(Math.abs(u), Math.abs(v)));
      return line * (0.3 + 0.7 * ss(0.1, 0.5, Math.cos((x + z) * 25) * 0.5 + 0.5));
    }
    case 'oxidation':
      return ss(
        0.38,
        0.62,
        noise([x * 0.6, y * 0.6, z * 0.6]) * 0.75 + noise([x * 3, y * 3, z * 3]) * 0.25,
      );
    case 'maze': {
      const row = Math.floor(z),
        flip = (((Math.floor(x) + row) % 2) + 2) % 2,
        u = fract(x),
        v = fract(z),
        d = Math.abs(Math.hypot(u - (flip ? 1 : 0), v) - 0.64);
      return 1 - ss(0.04, 0.11, d);
    }
    case 'growthbands':
      return ss(
        0.38,
        0.68,
        Math.cos(z * 5 + Math.sin(x * 0.7) * 1.2 + noise([x * 0.3, y * 0.3, z * 0.3])) * 0.5 + 0.5,
      );
    default:
      return undefined;
  }
}
export function bloomMicroHeight(style, u, v, noise) {
  const t = Math.PI * 2;
  switch (style) {
    case 'scutes': {
      const x = fract(u * 12 + Math.floor(v * 12) * 0.5) - 0.5,
        y = fract(v * 12) - 0.5;
      return (
        0.3 +
        0.48 * Math.max(0, 1 - Math.max(Math.abs(x) * 1.8, Math.abs(y) * 1.7 + Math.abs(x) * 0.45))
      );
    }
    case 'petalgrain':
      return (
        0.48 +
        0.18 * Math.sin((u * 18 + Math.sin(v * t * 2) * 0.28) * t) +
        0.055 * Math.sin(v * t * 30) +
        noise * 0.04
      );
    case 'suction': {
      const x = fract(u * 10) - 0.5,
        y = fract(v * 10) - 0.5,
        d = Math.hypot(x, y);
      return (
        0.38 + 0.35 * Math.exp(-Math.pow((d - 0.27) / 0.065, 2)) - 0.12 * Math.exp((-d * d) / 0.02)
      );
    }
    case 'ribcloth':
      return (
        0.48 +
        0.15 * Math.cos(u * t * 24) +
        0.09 * Math.cos(v * t * 24) * Math.sin(u * t * 12) +
        noise * 0.04
      );
    case 'gravel':
      return 0.35 + 0.32 * noise + 0.12 * Math.sin(u * t * 27) * Math.sin(v * t * 23);
    case 'hammered':
      return (
        0.52 +
        0.17 * Math.cos(u * t * 12 + Math.sin(v * t * 6)) * 0.7 +
        0.12 * Math.sin(v * t * 14 + Math.cos(u * t * 4))
      );
    default:
      return undefined;
  }
}
// Indices 0..33 retain the previous pattern meanings.
export const BLOOM_PATTERN_GLSL = `
  if(kind<34.5){float u=fract(p.x*.8+floor(p.z*.8)*.5)-.5,v=fract(p.z*.8)-.5;return 1.0-smoothstep(.025,.10,abs(max(abs(u)*.85,abs(v)+abs(u)*.35)-.4));}
  if(kind<35.5){return max(1.0-smoothstep(.03,.08,abs(p.x)),(1.0-smoothstep(.02,.08,abs(sin(p.z*4.0-abs(p.x)*5.0))))*.68);}
  if(kind<36.5){return max(smoothstep(.66,.80,skinNoise(p*5.0)),smoothstep(.60,.74,skinNoise(p*.8))*.3);}
  if(kind<37.5){return smoothstep(.25,.65,cos(p.z*1.8)*.5+.5)*(1.0-smoothstep(.15,.65,abs(sin(p.x*.7+p.y*.4))));}
  if(kind<38.5){vec2 q=fract(p.xz)-.5;float line=1.0-smoothstep(.018,.065,min(abs(q.x),abs(q.y)));return line*(.3+.7*smoothstep(.1,.5,cos((p.x+p.z)*25.0)*.5+.5));}
  if(kind<39.5){return smoothstep(.38,.62,skinNoise(p*.6)*.75+skinNoise(p*3.0)*.25);}
  if(kind<40.5){float f=mod(floor(p.x)+floor(p.z),2.0);vec2 q=fract(p.xz);float d=abs(length(vec2(q.x-f,q.y))-.64);return 1.0-smoothstep(.04,.11,d);}
  if(kind<41.5)return smoothstep(.38,.68,cos(p.z*5.0+sin(p.x*.7)*1.2+skinNoise(p*.3))*.5+.5);
  ${FIELD_PATTERN_GLSL}
`;
