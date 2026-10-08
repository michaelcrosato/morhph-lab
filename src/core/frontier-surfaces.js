import { BLOOM_PATTERN_GLSL } from './bloom-surfaces.js';
/** CPU pigment functions and GLSL use the same equations. No external texture files. */
export const FRONTIER_PATTERNS = Object.freeze([
  'combtracks',
  'polypcells',
  'fanrays',
  'dendrite',
  'foldbands',
  'holofoil',
  'tessera',
  'saltfleck',
]);
export const FRONTIER_MICRO = Object.freeze([
  'cilia',
  'pleats',
  'meshknit',
  'chalk',
  'tesserae',
  'capillary',
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
export const FRONTIER_SURFACES = Object.freeze({
  combglass: recipe('Comb light', 'combtracks', 0.3, 0.12, 0.018, 'cilia', 0.38),
  colony: recipe('Colony tissue', 'polypcells', 0.56, 0.02, 0.035, 'capillary'),
  starvelvet: recipe('Radial velvet', 'fanrays', 0.93, 0, 0.032, 'chalk'),
  branchhide: recipe('Branch hide', 'dendrite', 0.82, 0.01, 0.049, 'capillary'),
  pleatcloth: recipe('Pleated cloth', 'foldbands', 0.89, 0, 0.041, 'pleats'),
  foilskin: recipe('Interference foil', 'holofoil', 0.28, 0.45, 0.015, 'meshknit'),
  mosaic: recipe('Mosaic enamel', 'tessera', 0.37, 0.18, 0.026, 'tesserae'),
  saltpaper: recipe('Salt paper', 'saltfleck', 0.97, 0, 0.048, 'chalk'),
});
const fract = x => x - Math.floor(x),
  smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
export function frontierPattern(name, [x, y, z], noise) {
  switch (name) {
    case 'combtracks':
      return (
        (1 - smooth(0.06, 0.19, Math.abs(fract(x * 0.7) - 0.5))) *
        smooth(0.35, 0.62, Math.sin(z * 9 + y) * 0.5 + 0.5)
      );
    case 'polypcells': {
      const qx = fract(x * 0.6 + Math.floor(z * 0.6) * 0.5) - 0.5,
        qz = fract(z * 0.6) - 0.5,
        d = Math.hypot(qx, qz);
      return (1 - smooth(0.28, 0.37, d)) * (0.35 + 0.65 * smooth(0.11, 0.2, d));
    }
    case 'fanrays':
      return smooth(0.3, 0.7, Math.cos(Math.atan2(z, x) * 12 + Math.hypot(x, z) * 0.4) * 0.5 + 0.5);
    case 'dendrite': {
      const a = Math.abs(x - Math.sin(z * 0.4) * 0.22),
        b = Math.abs(Math.sin(z * 2.8 - Math.abs(x) * 4)),
        c = Math.abs(Math.sin(z * 5.6 + Math.abs(x) * 7));
      return Math.max(
        1 - smooth(0.025, 0.07, a),
        (1 - smooth(0.035, 0.12, b)) * 0.75,
        (1 - smooth(0.02, 0.07, c)) * 0.3,
      );
    }
    case 'foldbands':
      return smooth(0.45, 0.7, Math.cos(x * 4 + Math.abs(fract(z * 0.4) - 0.5) * 6) * 0.5 + 0.5);
    case 'holofoil':
      return smooth(0.32, 0.73, Math.sin((x + z) * 4.1) * Math.cos((z - y) * 4.4) * 0.5 + 0.5);
    case 'tessera': {
      const row = Math.floor(z),
        fx = fract(x + row * 0.5),
        fz = fract(z);
      return (
        (1 - smooth(0.025, 0.09, Math.min(fx, 1 - fx, fz, 1 - fz))) * 0.75 +
        smooth(0.44, 0.6, noise([Math.floor(x + row * 0.5), 0, row])) * 0.25
      );
    }
    case 'saltfleck':
      return Math.max(
        smooth(0.62, 0.78, noise([x * 6, y * 6, z * 6])),
        smooth(0.65, 0.81, noise([x * 0.5, y * 0.5, z * 0.5])) * 0.35,
      );
    default:
      return undefined;
  }
}
/** Values are heights, not normal vectors. All periodic terms use integer cycles. */
export function frontierMicroHeight(style, u, v, noise) {
  const t = Math.PI * 2;
  switch (style) {
    case 'cilia':
      return (
        0.45 +
        0.22 * Math.sin(u * t * 24) * Math.pow(0.5 + 0.5 * Math.cos(v * t * 12), 3) +
        noise * 0.06
      );
    case 'pleats':
      return 0.32 + 0.42 * Math.abs(Math.sin((u * 16 + Math.sin(v * t) * 0.2) * t));
    case 'meshknit':
      return (
        0.42 +
        0.19 * Math.cos((u * 16 + v * 8) * t) * Math.cos((u * 16 - v * 8) * t) +
        0.045 * noise +
        0.025 * Math.sin(u * t * 3) * Math.cos(v * t * 5)
      );
    case 'chalk':
      return 0.45 + noise * 0.25 + 0.07 * Math.sin(u * t * 29) * Math.cos(v * t * 31);
    case 'tesserae': {
      const x = fract(u * 12 + Math.floor(v * 12) * 0.5),
        y = fract(v * 12);
      return (
        0.28 +
        0.42 * smooth(0.03, 0.11, Math.min(x, 1 - x, y, 1 - y)) +
        0.055 * noise +
        0.025 * Math.sin((u * 5 + v * 7) * t)
      );
    }
    case 'capillary':
      return (
        0.42 +
        0.24 *
          Math.pow(Math.max(0, Math.cos(u * t * 9 + Math.sin(v * t * 3)) * Math.cos(v * t * 11)), 4)
      );
    default:
      return undefined;
  }
}
// Pattern indices 0..25 retain their version-6 values.
export const FRONTIER_PATTERN_GLSL = `
  if(kind<26.5){return (1.0-smoothstep(.06,.19,abs(fract(p.x*.7)-.5)))*smoothstep(.35,.62,sin(p.z*9.0+p.y)*.5+.5);}
  if(kind<27.5){vec2 q=vec2(fract(p.x*.6+floor(p.z*.6)*.5)-.5,fract(p.z*.6)-.5);float d=length(q);return (1.0-smoothstep(.28,.37,d))*(.35+.65*smoothstep(.11,.20,d));}
  if(kind<28.5){return smoothstep(.30,.70,cos(atan(p.z,p.x)*12.0+length(p.xz)*.4)*.5+.5);}
  if(kind<29.5){float a=abs(p.x-sin(p.z*.4)*.22),b=abs(sin(p.z*2.8-abs(p.x)*4.0)),c=abs(sin(p.z*5.6+abs(p.x)*7.0));return max(1.0-smoothstep(.025,.07,a),max((1.0-smoothstep(.035,.12,b))*.75,(1.0-smoothstep(.02,.07,c))*.30));}
  if(kind<30.5){return smoothstep(.45,.70,cos(p.x*4.0+abs(fract(p.z*.4)-.5)*6.0)*.5+.5);}
  if(kind<31.5){return smoothstep(.32,.73,sin((p.x+p.z)*4.1)*cos((p.z-p.y)*4.4)*.5+.5);}
  if(kind<32.5){float row=floor(p.z),x=fract(p.x+row*.5),z=fract(p.z);return (1.0-smoothstep(.025,.09,min(min(x,1.0-x),min(z,1.0-z))))*.75+smoothstep(.44,.60,skinNoise(vec3(floor(p.x+row*.5),0.0,row)))*.25;}
  if(kind<33.5)return max(smoothstep(.62,.78,skinNoise(p*6.0)),smoothstep(.65,.81,skinNoise(p*.5))*.35);
  ${BLOOM_PATTERN_GLSL}
`;
