import {FIELD_MOTION} from './field-motion.js';
import {BLOOM_MOTION} from './bloom-motion.js';
import {FRONTIER_MOTION} from './frontier-motion.js';
import {defaultHumanoidMotion,validateHumanoidMotion,blendHumanoidMotion} from './humanoid-motion.js';
import {defaultTravel,defaultBodyWave,validateTravel,validateBodyWave,blendTravel,blendBodyWave} from './travel.js';
import {clamp} from './math.js';
/** Pure motion recipes. These are scalar channels, not imported animation clips. */
export const MOTION_CLIPS=Object.freeze({
  ...FRONTIER_MOTION,...BLOOM_MOTION,...FIELD_MOTION,
  idle:{label:'Idle',stepBank:0,valve:0,bloom:0,reach:0,pad:0,sense:0,comb:0,pump:0,spread:0,spin:0,fold:0,scull:0,wingRate:1,wingOpen:.65,pulse:0,paddle:0,lateral:0,rate:0,stride:0,lift:.1,stance:.66,bob:.012,sway:.012,pitch:0,flap:0,tail:.3,jaw:.02,tuck:0},
  walk:{label:'Walk',rate:1.05,stride:.62,lift:.26,stance:.62,bob:.045,sway:.035,pitch:0,flap:.08,tail:.6,jaw:.04,tuck:0},
  run:{label:'Run',rate:2.2,stride:1.04,lift:.39,stance:.5,bob:.09,sway:.04,pitch:.05,flap:.15,tail:.9,jaw:.08,tuck:0},
  creep:{label:'Creep',rate:.65,stride:.45,lift:.13,stance:.76,bob:.018,sway:.06,pitch:.07,flap:0,tail:.25,jaw:.02,tuck:.08},
  bound:{label:'Bound',rate:1.4,stride:.75,lift:.55,stance:.44,bob:.14,sway:.01,pitch:.09,flap:.2,tail:.8,jaw:.03,tuck:0},
  swim:{label:'Swim',rate:.8,stride:.2,lift:.18,stance:.5,bob:.035,sway:.13,pitch:.06,flap:.35,tail:1.3,jaw:.04,tuck:.18},
  hover:{label:'Hover',rate:.65,stride:.12,lift:.13,stance:.5,bob:.085,sway:.025,pitch:-.04,flap:1.2,tail:.7,jaw:.02,tuck:.28},
  backpedal:{label:'Backpedal',rate:.85,stride:-.48,lateral:0,lift:.18,stance:.68,bob:.035,sway:.03,pitch:-.03,flap:.05,tail:.5,jaw:.02,tuck:.02},
  strafe:{label:'Side step',rate:.95,stride:0,lateral:.50,lift:.22,stance:.64,bob:.035,sway:.05,pitch:0,flap:.06,tail:.5,jaw:.02,tuck:.02},
  prowl:{label:'Prowl',rate:.58,stride:.40,lift:.11,stance:.80,bob:.018,sway:.07,pitch:.12,flap:0,tail:.3,jaw:.03,tuck:.17},
  trot:{label:'Trot',rate:1.6,stride:.74,lift:.31,stance:.55,bob:.068,sway:.03,pitch:.03,flap:.14,tail:.75,jaw:.05,tuck:0},
  cruise:{label:'Swim cruise',rate:1.2,stride:0,lift:0,stance:.6,bob:.015,sway:.015,pitch:0,flap:.22,tail:1.5,jaw:.02,tuck:.2,wingRate:1,wingOpen:.9,pulse:0,paddle:.3},
  undulate:{label:'Eel wave',rate:.7,stride:0,lift:0,stance:.6,bob:0,sway:.01,pitch:0,flap:.25,tail:1.7,jaw:.02,tuck:.25,wingRate:.8,wingOpen:1,pulse:0,paddle:.1},
  jet:{label:'Jet pulse',rate:.8,stride:0,lift:0,stance:.6,bob:.04,sway:.012,pitch:0,flap:.2,tail:.5,jaw:.18,tuck:.2,wingRate:.8,wingOpen:.7,pulse:1,paddle:0},
  row:{label:'Paddle stroke',rate:.65,stride:0,lift:0,stance:.6,bob:.015,sway:.022,pitch:0,flap:.22,tail:.5,jaw:.02,tuck:.15,wingRate:.85,wingOpen:1,pulse:0,paddle:1},
  soar:{label:'Soar',rate:.25,stride:0,lift:0,stance:.6,bob:.03,sway:.035,pitch:-.03,flap:.12,tail:.3,jaw:.01,tuck:.3,wingRate:.45,wingOpen:1,pulse:0,paddle:0},
  powerflight:{label:'Power flight',rate:1.3,stride:0,lift:0,stance:.6,bob:.08,sway:.025,pitch:-.07,flap:1,tail:.8,jaw:.01,tuck:.4,wingRate:1.45,wingOpen:1,pulse:0,paddle:0},
  flutter:{label:'Flutter',rate:1.8,stride:0,lift:0,stance:.6,bob:.025,sway:.02,pitch:-.025,flap:1.3,tail:.4,jaw:.01,tuck:.35,wingRate:4.5,wingOpen:1,pulse:0,paddle:0},
  float:{label:'Float',rate:.25,stride:0,lift:0,stance:.6,bob:.10,sway:.025,pitch:0,flap:.10,tail:.45,jaw:.02,tuck:.15,wingRate:.5,wingOpen:.9,pulse:.25,paddle:0},
  display:{label:'Display',rate:.28,stride:.1,lift:.08,stance:.8,bob:.035,sway:.055,pitch:-.08,flap:.5,tail:.85,jaw:.65,tuck:0}
});
export const MOTION_LAYERS={breath:'Breathing',blink:'Blinking',gaze:'Gaze',tail:'Tail wave',flex:'Soft-part flex',jaw:'Jaw motion'};
export function defaultMotion(clip='idle'){
  return {travel:defaultTravel(),bodyWave:defaultBodyWave(),humanoid:defaultHumanoidMotion(),weights:Object.fromEntries(Object.keys(MOTION_CLIPS).map(k=>[k,k===clip?1:0])),layers:{breath:1,blink:1,gaze:1,tail:1,flex:1,jaw:1},tempo:1,stride:1,lift:1,phaseLag:.5};
}
export function validateMotion(raw=defaultMotion()){
  if(!raw||typeof raw!=='object')throw new Error('Invalid blueprint: motion must be an object.');
  for(const group of ['weights','layers'])if(raw[group]!==undefined&&(!raw[group]||typeof raw[group]!=='object'||Array.isArray(raw[group])))throw new Error('Invalid blueprint: motion '+group+' must be an object.');
  const fallback=defaultMotion(),out={weights:{},layers:{}};
  const n=(v,d,lo,hi,label)=>{v=v===undefined?d:v;if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw new Error(`Invalid blueprint: ${label} must be between ${lo} and ${hi}.`);return v;};
  for(const k of Object.keys(MOTION_CLIPS))out.weights[k]=n(raw.weights?.[k],fallback.weights[k],0,1,'motion weight');
  for(const k of Object.keys(MOTION_LAYERS))out.layers[k]=n(raw.layers?.[k],1,0,2,'motion layer');
  for(const [k,lo,hi] of [['tempo',.1,3],['stride',.1,2],['lift',.1,2],['phaseLag',0,1]])out[k]=n(raw[k],fallback[k],lo,hi,k);
  out.travel=validateTravel(raw.travel);out.bodyWave=validateBodyWave(raw.bodyWave);out.humanoid=validateHumanoidMotion(raw.humanoid);return out;
}
export function blendMotion(a,b,t){
  const out=defaultMotion();for(const group of ['weights','layers'])for(const k of Object.keys(out[group]))out[group][k]=a[group][k]+(b[group][k]-a[group][k])*t;
  for(const k of ['tempo','stride','lift','phaseLag'])out[k]=a[k]+(b[k]-a[k])*t;out.travel=blendTravel(a.travel??defaultTravel(),b.travel??defaultTravel(),t);out.bodyWave=blendBodyWave(a.bodyWave??defaultBodyWave(),b.bodyWave??defaultBodyWave(),t);out.humanoid=blendHumanoidMotion(a.humanoid,b.humanoid,t);return out;
}
/** Normalize state weights once. Secondary layers remain additive and independent. */
export function sampleMotion(motion,{speed=0,preview=true,walking}={}){
  const m=motion||defaultMotion();let weights={...m.weights};
  if(walking!==undefined)weights=defaultMotion(walking?'walk':'idle').weights;
  if(!preview&&speed>.12&&(!m.travel||m.travel.medium==='ground')){const fast=clamp((speed-2)/3,0,1);weights={...weights,idle:0,walk:Math.max(weights.walk,1-fast),run:Math.max(weights.run,fast)};}
  let sum=Object.values(weights).reduce((a,b)=>a+b,0);if(sum<1e-8){weights={idle:1};sum=1;}
  const out={};for(const k of Object.keys(MOTION_CLIPS.idle))if(k!=='label')out[k]=0;
  for(const [key,weight] of Object.entries(weights))for(const k of Object.keys(out))out[k]+=(MOTION_CLIPS[key][k]??0)*weight/sum;
  if(!preview&&speed<=.12&&(!m.travel||m.travel.medium==='ground')){out.rate=0;out.stride=0;out.bob=.012;}
  out.rate*=m.tempo;out.stride*=m.stride;out.lateral*=m.stride;out.lift*=m.lift;out.phaseLag=m.phaseLag;out.layers=m.layers;return out;
}
