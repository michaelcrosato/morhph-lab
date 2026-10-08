import {clamp,smooth,TAU} from './math.js';
const clip=(label,values)=>({label,rate:.7,stride:0,lateral:0,lift:0,stance:.64,bob:.02,sway:.01,pitch:0,flap:0,tail:.3,jaw:.02,tuck:0,wingRate:1,wingOpen:1,pulse:0,paddle:0,comb:0,pump:0,spread:0,spin:0,fold:0,scull:0,stepBank:0,valve:0,bloom:0,reach:0,pad:0,sense:0,...values});
export const BLOOM_MOTION=Object.freeze({
  ripplewalk:clip('Ripple walk',{rate:.9,stride:.45,lift:.18,stepBank:1,fold:.2,bob:.035}),
  shellclap:clip('Shell clap',{valve:1,wingRate:.7,pulse:.3}),
  bloomcycle:clip('Bloom cycle',{bloom:1,wingRate:.45,bob:.04}),
  siphonreach:clip('Trunk reach',{reach:1,sense:.25,wingRate:.65}),
  padcrawl:clip('Cup sequence',{pad:1,reach:.3,wingRate:.8}),
  sensorscan:clip('Sensory sweep',{sense:1,reach:.3,wingRate:.55})
});
export const BLOOM_ACTIONS=Object.freeze({
  salute:{label:'Salute',duration:2.5,mask:'upper',loop:false,events:[]},
  beckon:{label:'Beckon',duration:2.3,mask:'upper',loop:true,events:[]},
  shiver:{label:'Shiver',duration:2.8,mask:'upper',loop:true,events:[]},
  stretch:{label:'Stretch',duration:3.8,mask:'full',loop:true,events:[]},
  overhead:{label:'Lift overhead',duration:2.8,mask:'upper',loop:false,events:[{at:.32,name:'grip-cue'},{at:.72,name:'lift-peak'}]},
  sweep:{label:'Sweep tool',duration:2.2,mask:'upper',loop:true,events:[{at:.55,name:'sweep-contact'}]}
});
/** Pose samples are absolute. Events are cues, not gameplay effects. */
export function applyBloomAction(name,pose,t){
  const r=(id,x=0,y=0,z=0)=>{pose.rotations[id]=[x,y,z];},v=Math.sin(t*TAU),pulse=Math.sin(t*Math.PI);
  switch(name){
    case 'salute':r('upperArm.R',-2.76,1.20,.23);r('forearm.R',-1.215);r('hand.R',0,0,-.6);r('head',-.06,-.08);pose.handCurl=.12;break;
    case 'beckon':r('upperArm.R',-1.1,0,-.28);r('forearm.R',-.55-(.5+.5*Math.sin(t*TAU*2))*.8);r('hand.R',-.3-v*.2);r('head',0,-.12);pose.handCurl=.35+.25*v;break;
    case 'shiver':{const tremor=Math.sin(t*TAU*11);r('chest',.12,0,tremor*.018);r('upperArm.L',-.5,0,-.3+tremor*.025);r('upperArm.R',-.5,0,.3-tremor*.025);r('forearm.L',-1.9,0,-.6);r('forearm.R',-1.9,0,.6);r('head',.18,0,tremor*.025);pose.handCurl=.7;break;}
    case 'stretch':r('upperArm.L',-.2,0,2.6);r('upperArm.R',-.2,0,-2.6);r('forearm.L',-.18);r('forearm.R',-.18);r('spine',-.1,0,.14*v);r('head',-.2,0,-.1*v);r('upperLeg.L',0,0,.06);r('upperLeg.R',0,0,-.06);pose.pelvisOffset[0]=v*.035;break;
    case 'overhead':{const lift=smooth(clamp((t-.25)/.5,0,1));for(const [s,e] of [[1,'.L'],[-1,'.R']]){r('upperArm'+e,-.7-lift*1.9,0,s*.22);r('forearm'+e,-1.4+lift*1.15);r('hand'+e,.25-lift*.4);}r('chest',-.08*lift);r('head',-.25*lift);pose.handCurl=.8;break;}
    case 'sweep':r('chest',.12,v*.3);r('upperArm.L',-1.0,0,.08);r('upperArm.R',-.65,0,-.12);r('forearm.L',-.48);r('forearm.R',-1.1);r('hand.L',0,.35);r('hand.R',0,-.25);r('head',.23,-v*.18);pose.handCurl=1;break;
  }
}
