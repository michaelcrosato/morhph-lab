import {rng,TAU} from './math.js';
/** One deterministic level description feeds both visuals and physics. */
export function makeLevel(seed=810){
  const r=rng(seed),rocks=[],balls=[],spores=[];
  for(let i=0;i<22;i++){const a=i/22*TAU+r()*.2,rad=13+r()*5;rocks.push({id:'rock'+i,x:Math.cos(a)*rad,z:Math.sin(a)*rad,radius:.65+r()*1.05,height:.7+r()*1.9,seed:Math.floor(r()*1e6)});}
  for(let i=0;i<6;i++){const a=i*2.4;balls.push({id:'ball'+i,x:Math.cos(a)*6,z:Math.sin(a)*6,radius:.45+r()*.25});}
  for(let i=0;i<8;i++){const a=i*2.3999632297+.45,rad=2.7+i*.92;spores.push({id:'spore'+i,x:Math.sin(a)*rad,z:Math.cos(a)*rad,y:.55});}
  return {seed,radius:22,rocks,balls,spores,ramp:{x:-6,y:.45,z:-4,width:2,height:.2,depth:3,angle:-.16}};
}
