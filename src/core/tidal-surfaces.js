import { FRONTIER_PATTERN_GLSL } from './frontier-surfaces.js';
export const TIDAL_PATTERNS = [
  'cycloid',
  'chromatophore',
  'featherbarbs',
  'eyespots',
  'lightrows',
  'shellgrowth',
  'wingveins',
  'currentbands',
];
export const TIDAL_MICRO = ['denticles', 'feather', 'down', 'lamellae', 'growthrings', 'wingmesh'];
const recipe = (label, pattern, roughness, metalness, relief, micro, emission = 0) => ({
  label,
  pattern,
  roughness,
  metalness,
  relief,
  micro,
  emission,
});
export const TIDAL_SURFACES = Object.freeze({
  pelagic: recipe('Pelagic scales', 'cycloid', 0.29, 0.12, 0.028, 'denticles'),
  eelhide: recipe('Eel hide', 'chromatophore', 0.32, 0.03, 0.016, 'denticles'),
  jelly: recipe('Jelly sheen', 'currentbands', 0.26, 0.05, 0.009, 'lamellae', 0.22),
  nacre: recipe('Shell nacre', 'shellgrowth', 0.27, 0.26, 0.023, 'growthrings'),
  tropical: recipe('Tropical markings', 'eyespots', 0.36, 0.08, 0.022, 'scales'),
  abyssal: recipe('Abyssal lights', 'lightrows', 0.38, 0.06, 0.024, 'denticles', 0.9),
  rayhide: recipe('Ray hide', 'chromatophore', 0.63, 0.02, 0.034, 'denticles'),
  tidalarmor: recipe('Tidal armor', 'cycloid', 0.43, 0.24, 0.055, 'growthrings'),
  plumage: recipe('Flight plumage', 'featherbarbs', 0.92, 0, 0.033, 'feather'),
  wingfilm: recipe('Wing film', 'wingveins', 0.29, 0.1, 0.012, 'wingmesh'),
  mothdust: recipe('Moth dust', 'eyespots', 0.97, 0, 0.045, 'down'),
  seedhusk: recipe('Seed husk', 'currentbands', 0.87, 0, 0.054, 'growthrings'),
});
export const TIDAL_PATTERN_GLSL = `
  if(kind<18.5){vec2 q=p.xz;q.x+=mod(floor(q.y),2.0)*.5;vec2 f=fract(q)-.5;return 1.0-smoothstep(.02,.09,abs(length(vec2(f.x,f.y*.72))-.39));}
  if(kind<19.5){float a=skinNoise(p*.42),b=skinNoise(p*1.9);return smoothstep(.32,.64,a*.6+b*.4);}
  if(kind<20.5){float shaft=1.0-smoothstep(.025,.065,abs(fract(p.x)-.5));float barbs=1.0-smoothstep(.035,.11,abs(sin((p.z+abs(fract(p.x)-.5)*1.8)*8.0)));return max(shaft,barbs*.74);}
  if(kind<21.5){vec2 f=fract(p.xz*.48)-.5;float d=length(f*vec2(1.0,1.2));float ring=smoothstep(.19,.235,d)*(1.0-smoothstep(.31,.36,d));return max(ring,(1.0-smoothstep(.08,.14,d))*.75);}
  if(kind<22.5){vec2 q=fract(vec2(p.z*1.6,p.y*.7))-.5;return (1.0-smoothstep(.09,.18,length(q)))*(.65+.35*sin(p.x*.5));}
  if(kind<23.5){float r=length(p.xy),a=atan(p.y,p.x);return smoothstep(.40,.70,sin(r*7.5+a*1.7)*.5+.5);}
  if(kind<24.5){vec2 q=vec2(p.z,p.y);float main=abs(q.x-sin(q.y*.35)*.3);float ribs=abs(sin(q.y*2.5+abs(q.x)*2.0));return max(1.0-smoothstep(.03,.09,main),1.0-smoothstep(.04,.13,ribs));}
  if(kind<25.5) return smoothstep(.38,.72,sin(p.z*2.1+sin(p.x*.7)*2.2+sin(p.y*.9))*.5+.5);
  ${FRONTIER_PATTERN_GLSL}
`;
