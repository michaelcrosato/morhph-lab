import {clamp,smooth,TAU} from './math.js';
/** Author actions as pose functions. All samples are absolute, so scrubbing is safe. */
export const EXPANSION_ACTIONS=Object.freeze({
  bow:{label:'Bow',duration:2.4,mask:'upper',loop:false,events:[]},
  kneel:{label:'Kneel',duration:2.2,mask:'full',loop:false,hold:true,events:[]},
  pray:{label:'Pray',duration:3.2,mask:'upper',loop:true,events:[]},
  inspect:{label:'Inspect hand',duration:3,mask:'upper',loop:true,events:[]},
  interact:{label:'Reach / use',duration:2.1,mask:'upper',loop:false,events:[{at:.55,name:'interact-contact'}]},
  carry:{label:'Carry',duration:2.4,mask:'upper',loop:true,events:[]},
  push:{label:'Push',duration:2.2,mask:'upper',loop:true,events:[{at:.55,name:'push-contact'}]},
  work:{label:'Work strike',duration:1.6,mask:'upper',loop:true,events:[{at:.56,name:'work-contact'}]},
  thrust:{label:'Thrust',duration:1,mask:'upper',loop:false,events:[{at:.5,name:'attack-contact'}]},
  kick:{label:'Kick',duration:1.25,mask:'full',loop:false,events:[{at:.5,name:'attack-contact'}]},
  dodge:{label:'Dodge pose',duration:1,mask:'full',loop:false,events:[{at:.3,name:'dodge-peak'}]},
  roar:{label:'Roar',duration:2.5,mask:'upper',loop:false,events:[{at:.42,name:'voice-cue'}]}
});
export function applyExpansionAction(name,pose,t){
  const r=(name,x=0,y=0,z=0)=>{pose.rotations[name]=[x,y,z];};
  const v=Math.sin(t*TAU),pulse=Math.sin(Math.PI*t),reach=smooth(clamp((t-.15)/.4,0,1));
  switch(name){
    case 'bow':r('spine',.44*pulse);r('chest',.35*pulse);r('head',.27*pulse);r('upperArm.L',-.16,0,.07);r('upperArm.R',-.20,0,-.07);r('forearm.R',-.95);break;
    case 'kneel':r('upperLeg.L',-1.52);r('shin.L',1.52);r('foot.L',0);r('upperLeg.R',.05);r('shin.R',2.4);r('foot.R',-1.0);r('chest',.14);r('head',.20);r('forearm.L',-.85);r('forearm.R',-.7);pose.pelvisOffset[1]=-.42;break;
    case 'pray':r('upperArm.L',-.85,0,-.18);r('upperArm.R',-.85,0,.18);r('forearm.L',-1.6,0,-.3);r('forearm.R',-1.6,0,.3);r('hand.L',0,0,.24);r('hand.R',0,0,-.24);r('head',.25);break;
    case 'inspect':r('upperArm.L',-.78,0,.10);r('forearm.L',-1.75,.25,0);r('hand.L',0,v*.38,-.3);r('head',.22,.18,0);r('upperArm.R',-.15);pose.handCurl=.18;break;
    case 'interact':r('upperArm.R',-.5-.85*reach,0,-.14);r('forearm.R',-.8+.65*reach);r('hand.R',-.2);r('chest',.08,-.10,0);pose.handCurl=.35*reach;break;
    case 'carry':for(const [end,side] of [['L',1],['R',-1]]){r('upperArm.'+end,-.38,0,side*.18);r('forearm.'+end,-1.6);r('hand.'+end,0,side*.25,0);}r('chest',-.04);pose.handCurl=.4;break;
    case 'push':for(const [end,side] of [['L',1],['R',-1]]){r('upperArm.'+end,-1.35-v*.08,0,side*.12);r('forearm.'+end,-.35+v*.14);r('hand.'+end,.9);}r('spine',.2);break;
    case 'work':{const strike=smooth(clamp((t-.28)/.28,0,1));r('upperArm.R',-2.25+strike*1.3,0,-.14);r('forearm.R',-1.45+strike*.95);r('chest',strike*.16);r('upperArm.L',-.4);r('forearm.L',-.95);pose.handCurl=1;break;}
    case 'thrust':{const thrust=Math.sin(Math.PI*clamp((t-.18)/.64,0,1));r('upperArm.R',-.6-thrust*.95,-.2,0);r('forearm.R',-1.55+thrust*1.5);r('chest',.04,-.2-thrust*.17,0);r('upperArm.L',-.45,0,.2);r('forearm.L',-1.2);pose.handCurl=1;break;}
    case 'kick':{const extend=Math.sin(Math.PI*clamp((t-.15)/.65,0,1));r('upperLeg.R',-1.45*extend);r('shin.R',.95*(1-extend));r('foot.R',-.16);r('upperLeg.L',.10);r('shin.L',.10);r('foot.L',-.20);r('chest',-.22*extend);r('upperArm.L',-.6,0,.5);r('upperArm.R',-.6,0,-.5);r('forearm.L',-1);r('forearm.R',-1);pose.handCurl=.85;break;}
    case 'dodge':r('pelvis',0,0,-.15*pulse);r('chest',.2,0,-.30*pulse);r('upperLeg.L',-.6);r('upperLeg.R',-.9);r('shin.L',1.0);r('shin.R',1.3);r('foot.L',-.4);r('foot.R',-.4);r('upperArm.L',-.8,0,.4);r('upperArm.R',-.8,0,-.4);r('forearm.L',-1.3);r('forearm.R',-1.3);pose.pelvisOffset=[.3*pulse,-.20*pulse,0];break;
    case 'roar':r('chest',-.15*pulse);r('head',-.25*pulse);r('upperArm.L',-.3,0,.65);r('upperArm.R',-.3,0,-.65);r('forearm.L',-.55);r('forearm.R',-.55);pose.jaw=.5*pulse;pose.handCurl=.7;break;
  }
}
