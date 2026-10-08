import {bowPull} from './equipment-pose.js';
import {clamp,smooth,TAU} from './math.js';
const clip=(label,values)=>({label,rate:0,stride:0,lateral:0,lift:.08,stance:.7,bob:.014,sway:.012,pitch:0,flap:0,tail:.3,jaw:.04,tuck:0,wingRate:1,wingOpen:1,pulse:0,paddle:0,stepBank:0,sense:0,...values});
export const FIELD_MOTION=Object.freeze({
 animalamble:clip('Animal amble',{rate:.9,stride:.65,lift:.20,stance:.68,bob:.035,tail:.75,stepBank:1}),
 animalsniff:clip('Animal sniff',{rate:0,pitch:.16,bob:.025,tail:.25,jaw:.18,sense:1}),
 animalbound:clip('Animal bound',{rate:1.3,stride:.85,lift:.35,stance:.42,bob:.08,tail:.85,stepBank:1.2})
});
export const FIELD_ACTIONS=Object.freeze({
 readbook:{label:'Read book',duration:3.6,mask:'upper',loop:true,events:[{at:.6,name:'page-cue'}]},
 writenote:{label:'Write note',duration:3.0,mask:'upper',loop:true,events:[]},
 lamplook:{label:'Inspect with lamp',duration:3.2,mask:'upper',loop:true,events:[]},
 bowdraw:{label:'Draw bow',duration:2.8,mask:'upper',loop:true,events:[{at:.76,name:'release-cue'}]},
 offer:{label:'Offer item',duration:2.6,mask:'upper',loop:false,events:[{at:.58,name:'offer-cue'}]},
 restlean:{label:'Rest hands on hips',duration:3.4,mask:'upper',loop:true,events:[]}
});
/** Absolute pose targets. Props stay on one socket; no two-hand constraint or item transfer. */
export function applyFieldAction(name,pose,t){
 const r=(id,x=0,y=0,z=0)=>{pose.rotations[id]=[x,y,z];},v=Math.sin(t*TAU);
 switch(name){
  case 'readbook':r('upperArm.L',-.65,0,.12);r('forearm.L',-1.38);r('hand.L',.1,0,-.20);r('upperArm.R',-.72,0,-.08);r('forearm.R',-1.35);r('hand.R',0,0,.22);r('head',.28,v*.05);pose.handCurl=.22;break;
  case 'writenote':r('upperArm.L',-.66,0,.12);r('forearm.L',-1.45);r('hand.L',.1,0,-.15);r('upperArm.R',-.82,0,.15);r('forearm.R',-1.1+Math.sin(t*TAU*4)*.06);r('hand.R',0,v*.12,.22);r('head',.28);pose.handCurl=.6;break;
  case 'lamplook':r('upperArm.R',-1.15,-.25,-.15);r('forearm.R',-.62);r('hand.R',-.25);r('head',-.03,-.22+v*.14);r('upperArm.L',-.2,0,.1);pose.handCurl=.8;break;
  case 'bowdraw':{const pull=bowPull(t);r('chest',0,-.30);r('upperArm.L',-1.42,.06,.05);r('forearm.L',-.06);r('upperArm.R',-.9,-.75*pull,-.30);r('forearm.R',-.2-1.65*pull);r('head',-.06,-.3);pose.handCurl=.8;break;}
  case 'offer':{const reach=Math.sin(t*Math.PI);r('upperArm.R',-.45-.65*reach,0,-.12);r('forearm.R',-.6+.25*reach);r('hand.R',0,0,.3);r('head',.07);pose.handCurl=.18;break;}
  case 'restlean':r('upperArm.L',.10,0,.45);r('upperArm.R',.10,0,-.45);r('forearm.L',-.8,0,-.35);r('forearm.R',-.8,0,.35);r('head',0,v*.08);pose.handCurl=.35;break;
 }
}
