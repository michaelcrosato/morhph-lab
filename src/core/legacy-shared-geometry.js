/** Version 4 parts now use one geometry plan in the Inspector and Workshop.
 * Dimensions and variants follow the old factories. Triangulation is new.
 */
import {grid,sphere,tube,rod,rotate,rotated,translated} from './parametric-mesh.js';
import {box,prism} from './solid-mesh.js';
const TAU=2*Math.PI;
const motion=(mode,fields={})=>({pack:'legacy',mode,...fields});
const leaf=(w,h,c=.15)=>grid(12,4,(t,u)=>[(u*2-1)*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.8)*w,t*h,(1-Math.abs(u*2-1))*.09+Math.sin(t*Math.PI)*c]);
const ring=(r,y,thick=.02)=>tube(t=>[Math.cos(t*TAU)*r,y,Math.sin(t*TAU)*r],()=>thick,32,8);
export function buildLegacySharedPart(p,add){
 const v=p.variant,side=(p.side||1)*(p.mirrorSide??1);
 switch(p.type){
  case 'ear':{const h=v===2?.78:1.1,w=v===1?.22:.36,a=motion('ear');add(leaf(w,h,.13),'skin',a);add(translated(leaf(w*.65,h*.82,.13),[0,.035,.025]),'membrane',a);add(sphere([0,.035,0],[w*.72,.14,.16]),'skin');break;}
  case 'antler':{
   const h=v===1?1.15:1.45;add(tube(t=>[side*t*t*.28,t*h,-t*t*.2],t=>.14*(1-t)+.013,22,9),'bone');
   const n=v===2?5:3;for(let i=0;i<n;i++){const u=.28+i/(n+1)*.65,s=i%2?1:-1,l=.38+(i%2)*.16,x=side*u*u*.28;add(tube(t=>[x+side*s*t*.34,u*h+t*l,-u*u*.2-t*t*.16],t=>.065*(1-t)+.006,16,8),'bone');if(v===2)add(tube(t=>[x+side*s*.22+t*.13*side,u*h+l*.65+t*.23,-.12-t*.1],t=>.025*(1-t)+.004,10,6),'bone');}
   if(v===1)add(translated(leaf(.34,.76,.025),[side*.08,.34,-.03]),'bone');add(sphere([0,.02,0],[.21,.12,.21]),'skin');break;
  }
  case 'beak':{const w=v===1?.42:.24,l=v===2?1.18:.72,outline=[[-w,0],[-w*.75,l*.48],[0,l],[w*.75,l*.48],[w,0]];
   add(translated(prism(outline,.22),[0,0,.10]),'bone',motion('beakup'));const low=prism(outline.map(([x,y])=>[x*.9,y*.93]),.121);add(translated(low,[0,0,-.12]),'bone',motion('jaw'));add(sphere([0,.08,0],[w*.77,.14,.055]),'dark',motion('beakup'),true);
   if(v===0)add(tube(t=>[0,l-.08+t*.15,.1-t*t*.28],t=>.09*(1-t)+.005,16,8),'bone',motion('beakup'));break;}
  case 'muzzle':{const w=v===1?.48:.3,l=v===0?.68:.45;add(sphere([0,l*.43,.06],[w,l*.63,.25]),'skin');add(sphere([0,l,.06],[w*.55,.14,.13]),'dark','none',true);add(sphere([0,l*.47,-.15],[w*.85,l*.54,.10]),'skin',motion('jaw'));
   for(const s of [-1,1]){add(sphere([s*w*.65,l*.6,.15],[w*.52,.18,.08]),'accent');if(v===2)add(tube(t=>[s*(w*.8+t*t*.15),l*.3+t*.58,-.11+t*t*.17],t=>.07*(1-t)+.003,16,8),'bone',motion('jaw'));}break;}
  case 'crystal':{add(sphere([0,.06,0],[.34,.12,.32]),'armor');const n=v===2?3:v===1?7:5;for(let i=0;i<n;i++){const a=i/n*TAU,r=i===0?0:.23,h=i===0?1.1:.45+(i%3)*.18;let d=grid(1,5,(t,u)=>[Math.cos(u*TAU)*.16*(1-t),t*h-h*.5,Math.sin(u*TAU)*.16*(1-t)]);d=translated(rotated(rotated(d,'x',Math.sin(a)*.23),'z',-Math.cos(a)*.23),[Math.cos(a)*r,.1+h*.5,Math.sin(a)*r]);add(d,'glow');}break;}
  case 'foliage':{
   add(rod([0,0,0],[0,.5,0],.045),'skin');const n=v===2?3:v===0?8:5;
   for(let i=0;i<n;i++){const pivot=v===2?[(i-1)*.22,i*.12,0]:[0,i*.035,0],a=motion('leaf',{phase:i*.8,pivot,angle:v===2?0:i*2.4});
    if(v===2){add(translated(rod([0,0,0],[0,.56,0],.055),pivot),'bone',a);add(translated(grid(10,18,(t,u)=>[.32*Math.sin(t*Math.PI/2)*Math.cos(u*TAU),.55+.19*Math.cos(t*Math.PI/2),.32*Math.sin(t*Math.PI/2)*Math.sin(u*TAU)]),pivot),'accent',a);}else add(translated(rotated(leaf(v===0?.13:.26,.7+(i%3)*.12,.13),'y',i*2.4),pivot),'membrane',a);
   }break;}
  case 'blade':{add(rod([0,-.1,0],[0,.22,0],.06),'dark','none',true);add(sphere([0,-.11,0],[.085,.06,.085]),'metal');add(sphere([0,.22,0],[.26,.055,.075]),'metal');
   const outline=v===1?[[-.07,.24],[-.12,.86],[.1,1.36],[.23,1.48],[.15,1.08],[.06,.24]]:v===2?[[-.08,.23],[-.25,.50],[-.25,1.12],[.20,1.12],[.13,.23]]:[[-.08,.23],[-.10,1.12],[0,1.40],[.10,1.12],[.08,.23]];
   // The saber is split into convex sections for a stable fan triangulation.
   if(v===1){add(prism([outline[0],outline[1],outline[4],outline[5]],.05),'metal');add(prism([outline[1],outline[2],outline[3],outline[4]],.05),'metal');}else add(prism(outline,.05),'metal');
   if(v!==1)add(rod([0,.29,.034],[0,1.08,.034],.017),'accent');break;}
  case 'shield':{
   if(v===0){add(grid(1,32,(t,u)=>[Math.cos(u*TAU)*.5,(t-.5)*.11,Math.sin(u*TAU)*.5]),'armor');add(sphere([0,0,0],[.5,.055,.5],12,32),'armor');add(ring(.48,.064,.035),'metal');add(sphere([0,.1,0],[.15,.10,.15]),'metal');}
   else{const outline=v===1?[[-.40,.40],[-.44,-.1],[0,-.69],[.44,-.1],[.40,.40]]:[[-.38,.61],[-.43,-.55],[.43,-.55],[.38,.61]];add(rotated(prism(outline,.1),'x',-Math.PI/2),'armor');add(rotated(translated(prism(outline.map(([x,y])=>[x*.83,y*.83]),.02),[0,0,.062]),'x',-Math.PI/2),'accent');add(sphere([0,.11,0],[.13,.06,.13]),'metal');}
   add(rod([-.19,-.09,0],[.19,-.09,0],.042),'dark','none',true);break;
  }
  case 'staff':{add(rod([0,-1.1,0],[0,1.2,0],.055),v===0?'bone':'metal');for(let i=0;i<5;i++)add(ring(.06,-.13+i*.055,.016),'dark','none',true);
   if(v===0)add(tube(t=>[Math.sin(t*Math.PI)*.2,1.12+Math.sin(t*Math.PI*.8)*.34,0],()=>.055,18,8),'bone');
   else if(v===1){add(grid(2,4,(t,u)=>{const r=Math.sin(t*Math.PI)*.23;return [Math.cos(u*TAU)*r*.85,1.36+Math.cos(t*Math.PI)*.23*1.55,Math.sin(u*TAU)*r*.85];}),'glow');for(const s of [-1,1])add(tube(t=>[s*.18*Math.sin(t*Math.PI),1.08+t*.48,0],t=>.033*(1-t)+.009,16,8),'metal');}
   else for(const s of [-1,1])add(tube(t=>[s*(.05+t*.2),1.05+t*.54,-t*t*.07],t=>.065*(1-t)+.012,16,8),'bone');break;}
  case 'pack':{
   add(box([0,.18,0],[.64,.30,.79]),'cloth');add(sphere([0,.21,.39],[.34,.2,.19]),'cloth');for(const x of [-.21,.21])add(box([x,.35,0],[.07,.035,.82]),'dark','none',true);add(box([0,.38,.18],[.14,.04,.13]),'metal');
   if(v>0)for(const s of [-1,1])add(box([s*.41,.16,-.02],[.2,.23,.34]),'cloth');if(v===2){add(rod([-.415,.16,-.55],[.415,.16,-.55],.15),'cloth');for(const x of [-.33,.33])add(rod([x,-.04,-.57],[x,-.04,.45],.03),'bone');}break;
  }
  case 'pauldron':{for(let i=0;i<(v===2?4:3);i++)add(grid(10,20,(t,u)=>[(.42+i*.035)*Math.sin(t*Math.PI*.52)*Math.cos(u*TAU),-i*.08+.23*Math.cos(t*Math.PI*.52),(.38+i*.04)*Math.sin(t*Math.PI*.52)*Math.sin(u*TAU)]),'armor');if(v===1)for(let i=-1;i<=1;i++)add(tube(t=>[i*.19+i*t*.1,.15+t*.43,-t*t*.1],t=>.082*(1-t)+.003,14,8),'bone');break;}
  case 'banner':{add(rod([0,0,0],[0,1.8,0],.035),'bone');add(rod([-.51,1.6,0],[.51,1.6,0],.027),'metal');add(grid(14,12,(t,u)=>{const hem=v===0?Math.abs(u-.5)*.35:v===1?(1-Math.abs(u-.5)*2)*.24:0;return [(u-.5)*(v===2?1.22:.88),1.57-t*(.96-hem),0];}),'cloth',motion('banner'));break;}
  default:throw new Error('Unknown shared legacy part: '+p.type);
 }
}
export function animateLegacyVertex(a,point,p,time,pose={}){
 const s=p.size,l=s*p.length,f=p.flex*(pose.layers?.flex??1);if(p.flex===0)return point;
 const phase=time*1.5+p.phase*TAU,side=(p.side||1)*(p.mirrorSide??1);let q=[...point];
 const hinge=(axis,angle,origin=[0,0,0])=>{const c=origin.map((x,i)=>x*(i===1?l:s));return rotate(q.map((x,i)=>x-c[i]),axis,angle).map((x,i)=>x+c[i]);};
 switch(a.mode){
 case 'ear':q=rotate(q,'z',side*(.07+p.bend*.45+Math.pow(Math.max(0,Math.sin(phase)),12)*.17*(pose.layers?.gaze??1)*p.flex));return rotate(q,'x',(p.variant===2?1.02:0)+Math.sin(phase*.6)*.07*f);
 case 'jaw':return hinge('x',-(.04+Math.max(0,Math.sin(time*2+p.phase*TAU))*.1+(pose.jaw??0)*.2)*p.flex*(pose.layers?.jaw??1));
 case 'beakup':return hinge('x',(.08+(pose.jaw??.1)*.42+Math.max(0,Math.sin(time*2.1+p.phase*TAU))*.12)*.12*p.flex*(pose.layers?.jaw??1));
 case 'leaf':{q=hinge('y',-a.angle,a.pivot);q=hinge('x',(p.variant===2?0:.4)+p.bend*.25+Math.sin(time*1.6+a.phase+p.phase*TAU)*.11*f,a.pivot);return hinge('y',a.angle,a.pivot);}
 case 'banner':{const v=Math.max(0,Math.min(1,(1.57-q[1]/l)/.96));q[2]+=Math.sin(time*2.2+p.phase*TAU+(q[0]/s+.5)*4-v*3)*.12*v*s*f;return q;}
 default:return q;
 }
}
