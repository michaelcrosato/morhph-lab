import { TIDAL_PATTERN_GLSL } from '../core/tidal-surfaces.js';
/** Shared GLSL source. No renderer, texture or DOM dependency. */
export const SKIN_NOISE_GLSL = `
float skinHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float skinNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(mix(skinHash(i),skinHash(i+vec3(1,0,0)),f.x),mix(skinHash(i+vec3(0,1,0)),skinHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(skinHash(i+vec3(0,0,1)),skinHash(i+vec3(1,0,1)),f.x),mix(skinHash(i+vec3(0,1,1)),skinHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
/** Pattern IDs follow core/surfaces.js. Keep this function renderer-independent. */
export const SKIN_PATTERN_GLSL = `
float skinPattern(vec3 p,float kind,float warp){
  if(kind<.5)return 0.0;
  float n=skinNoise(p*.7);p+=vec3(n-.5)*warp;
  if(kind<1.5)return smoothstep(.6,.73,skinNoise(p));
  if(kind<2.5)return smoothstep(.53,.78,sin(p.z*2.5+n*4.0)*.5+.5);
  if(kind<3.5){vec2 q=p.xz; q.x+=mod(floor(q.y),2.0)*.5;return smoothstep(.32,.47,length(fract(q)-.5));}
  if(kind<4.5){vec3 q=abs(fract(p)-.5);return 1.0-smoothstep(.015,.1,min(q.x,min(q.y,q.z)));}
  if(kind<5.5)return smoothstep(.3,.75,sin(p.z*2.0+skinNoise(p*.45)*9.0)*.5+.5);
  if(kind<6.5)return smoothstep(.55,.8,sin(length(p.xz)*5.0+n*2.0)*.5+.5);
  if(kind<7.5)return smoothstep(.66,.8,skinNoise(p*3.0));
  if(kind<8.5)return smoothstep(.5,.75,sin((p.z+abs(p.x))*3.0)*.5+.5);
  if(kind<9.5)return 1.0-smoothstep(.015,.06,abs(skinNoise(p)-.5));
  if(kind<10.5){vec2 q=fract(p.xz)-.5;float d=length(q);return smoothstep(.20,.28,d)*(1.0-smoothstep(.35,.43,d));}
  if(kind<11.5)return smoothstep(.32,.72,skinNoise(p*.55)*.7+skinNoise(p*2.0)*.3);
  if(kind<12.5)return 1.0-smoothstep(.025,.10,abs(sin(p.x*1.7+skinNoise(p*.45)*5.0)));
  if(kind<13.5){vec2 q=abs(sin(p.xz*6.28318));return smoothstep(.32,.75,max(q.x*.85,q.y*.85));}
  if(kind<14.5){vec2 q=abs(fract(p.xz)-.5);return 1.0-smoothstep(.05,.13,min(q.x,q.y));}
  if(kind<15.5)return smoothstep(.35,.8,sin(p.x*5.0+skinNoise(p*.35)*7.0+p.y*.35)*.5+.5);
  if(kind<16.5){vec2 cell=floor(p.xz),q=fract(p.xz);float route=mod(cell.x+cell.y,2.0);float line=min(abs(q.x-.5),mix(abs(q.y-.25),abs(q.y-.75),route));return 1.0-smoothstep(.03,.075,line);}
  if(kind<17.5)return smoothstep(.46,.60,skinNoise(p*.4));
${TIDAL_PATTERN_GLSL}
}
float layeredPigment(vec3 position,vec4 params[4],vec4 warps,float seed){
  float value=0.0,total=0.0;
  for(int i=0;i<4;i++){
    vec4 l=params[i];vec3 p=position*l.y;float c=cos(l.w),s=sin(l.w);
    p.xz=mat2(c,-s,s,c)*p.xz;p+=vec3(seed);
    value+=skinPattern(p,l.x,warps[i])*l.z;total+=l.z;
  }
  return value/max(1.0,total);
}
`;
