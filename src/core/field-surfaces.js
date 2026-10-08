/** Small coat and repaired-cloth set. Fur is a surface field, not hair strands. */
export const FIELD_PATTERNS=Object.freeze(['countershade','coatflow','repairseams','wovencheck']);
export const FIELD_MICRO=Object.freeze(['shortcoat','woolloops','canvasgrain']);
export const FIELD_SURFACES=Object.freeze({
 shortcoat:{label:'Short animal coat',pattern:'countershade',roughness:.88,metalness:0,relief:.025,micro:'shortcoat',emission:0},
 woolcoat:{label:'Wool coat',pattern:'coatflow',roughness:.98,metalness:0,relief:.05,micro:'woolloops',emission:0},
 repaircloth:{label:'Repaired cloth',pattern:'repairseams',roughness:.92,metalness:0,relief:.025,micro:'canvasgrain',emission:0},
 checkcloth:{label:'Checked cloth',pattern:'wovencheck',roughness:.91,metalness:0,relief:.018,micro:'canvasgrain',emission:0}
});
const fract=x=>x-Math.floor(x),ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function fieldPattern(name,[x,y,z],noise){switch(name){
 case 'countershade':return 1-ss(-.65,.65,y+noise([x*.4,y*.4,z*.4])*.18);
 case 'coatflow':return (.4+.6*noise([x*.4,y*.4,z*.4]))*(1-ss(.10,.32,Math.abs(Math.sin(x*7+Math.sin(z*1.6)+y*.5))));
 case 'repairseams':{const u=fract(x*.6)-.5,v=fract(z*.6)-.5;return (1-ss(.025,.065,Math.min(Math.abs(u),Math.abs(v))))*(.25+.75*ss(.1,.4,Math.sin((x+z)*22)*.5+.5));}
 case 'wovencheck':{const a=ss(.45,.55,fract(x)),b=ss(.45,.55,fract(z));return a*.38+b*.38+a*b*.24;}
 default:return undefined;}}
export function fieldMicroHeight(name,u,v,n){const t=2*Math.PI;switch(name){
 case 'shortcoat':return .5+.12*Math.sin(u*t*28+Math.sin(v*t*4)*.55)+.045*Math.cos(v*t*19)+n*.04;
 case 'woolloops':return .5+.17*Math.sin(u*t*12+Math.sin(v*t*12))*.75+.12*Math.cos(v*t*12+Math.sin(u*t*12));
 case 'canvasgrain':return .48+.14*Math.sin(u*t*24)+.10*Math.sin(v*t*24)+n*.03;
 default:return undefined;}}
// New IDs follow the unchanged 42 earlier fields.
export const FIELD_PATTERN_GLSL=`
 if(kind<42.5)return 1.0-smoothstep(-.65,.65,p.y+skinNoise(p*.4)*.18);
 if(kind<43.5)return (.4+.6*skinNoise(p*.4))*(1.0-smoothstep(.10,.32,abs(sin(p.x*7.0+sin(p.z*1.6)+p.y*.5))));
 if(kind<44.5){vec2 q=fract(p.xz*.6)-.5;return (1.0-smoothstep(.025,.065,min(abs(q.x),abs(q.y))))*(.25+.75*smoothstep(.1,.4,sin((p.x+p.z)*22.0)*.5+.5));}
 float a=smoothstep(.45,.55,fract(p.x)),b=smoothstep(.45,.55,fract(p.z));return a*.38+b*.38+a*b*.24;
`;
