import {bowPull} from './equipment-pose.js';
/** Shared animal foundations and daily-use props. Local +Y is the mount normal. */
import {grid,sphere,tube,rod,rotate,rotated,translated} from './parametric-mesh.js';
import {box,prism} from './solid-mesh.js';
import {solveTwoBone} from './ik.js';
import {mapSegment} from './bloom-geometry.js';
const TAU=2*Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const motion=(mode,fields={})=>({pack:'field',mode,...fields});
const ring=(radius,y,r=.025)=>tube(t=>[Math.cos(t*TAU)*radius,y,Math.sin(t*TAU)*radius],()=>r,32,7);
const scaled=(q,p)=>q.map((v,i)=>v*p.size*(i===1?p.length:1));
export function buildFieldPart(p,add){
 const v=p.variant;
 switch(p.type){
  case 'beastleg':{
   const root=[0,0,0],knee=[0,.51,-.19],foot=[0,1.07,0],a=motion('leg',{root,knee,foot,bone:0}),b=motion('leg',{root,knee,foot,bone:1});
   add(tube(t=>[0,t*.51,-.19*t],t=>.17-.065*t,14,12),'skin',a);add(sphere(knee,[.12,.12,.12],10,14),'skin',a);
   add(tube(t=>[0,.51+t*.56,-.19+t*.19],t=>.095-.035*t,14,10),'skin',b);
   if(v===1){for(const s of [-1,1])add(box([s*.074,1.12,-.085],[.132,.18,.26]),'bone',b);}
   else{add(sphere([0,1.09,-.06],[v===2?.17:.15,.105,v===2?.27:.22],10,16),'skin',b);
    for(let i=-1;i<=1;i++){const end=[i*(v===2?.18:.09),1.13,-(v===2?.35:.22)];add(rod([i*.065,1.09,-.06],end,v===2?.038:.055),'skin',b);if(v===0)add(tube(t=>[end[0],end[1],end[2]-t*.065],t=>.022*(1-t)+.002,6,6),'bone',b);}
    if(v===2)add(grid(6,12,(t,u)=>[(u-.5)*.38*t,1.135,-.08-t*.27*(.8+.2*Math.cos(u*TAU))]),'membrane',b);
   }break;
  }
  case 'brushtail':{
   const curve=t=>[0,t*1.65,-.12*t*t],rad=t=>v===0?.035+.22*Math.pow(Math.sin(Math.PI*t),.65):v===1?.055+.14*Math.exp(-Math.pow((t-.84)/.14,2)):.10*(1-t)+.025;
   add(tube(curve,rad,34,12),'skin',motion('tail'));
   const count=v===2?14:9;for(let i=0;i<count;i++){const t=.18+i/(count-1)*.73,q=curve(t);for(const s of [-1,1]){const w=rad(t);add(tube(u=>[s*(w*.75+u*.09),q[1]+u*.10,q[2]],u=>.035*(1-u)+.002,5,6),'accent',motion('tail'));}}break;
  }
  case 'worktool':{
   add(rod([0,-.25,0],[0,.95,0],.055),'bone');for(let i=0;i<5;i++)add(ring(.061,-.12+i*.05,.012),'dark','none',true);
   if(v===0){add(box([0,.90,0],[.64,.22,.25]),'metal');for(const s of [-1,1])add(box([s*.32,.90,0],[.05,.26,.28]),'armor');}
   if(v===1)for(const s of [-1,1])add(tube(t=>[s*t*.6,.99-t*t*.20,0],t=>.085*(1-t)+.005,18,8),'metal');
   if(v===2){add(prism([[-.18,.82],[-.24,1.12],[-.15,1.38],[.15,1.38],[.24,1.12],[.18,.82]],.07),'metal');add(rod([0,.7,.05],[0,1.2,.05],.025),'accent');}break;
  }
  case 'fieldlamp':{
   const a=motion('lamp');add(tube(t=>[Math.sin(t*Math.PI)*.13,.10-Math.cos(t*Math.PI)*.12,0],()=>.025,18,7),'metal');
   add(rod([0,.13,0],[0,.3,0],.032),'metal',a);add(ring(.20,.35,.045),'metal',a);add(ring(.20,.81,.045),'metal',a);
   add(sphere([0,.58,0],[.11,.21,.11],14,20),'glow',a,true);
   for(let i=0;i<(v===2?3:6);i++){const angle=i/(v===2?3:6)*TAU;add(rod([Math.cos(angle)*.20,.35,Math.sin(angle)*.20],[Math.cos(angle)*.20,.81,Math.sin(angle)*.20],.022),'metal',a);}
   add(sphere([0,.85,0],[.25,.09,.25],10,16),'armor',a);add(sphere([0,.31,0],[.23,.06,.23],10,16),'metal',a);
   if(v===1)add(grid(12,18,(t,u)=>{const angle=(u*.65+.175)*TAU;return [Math.cos(angle)*.215,.36+t*.44,Math.sin(angle)*.215];}),'armor',a);
   if(v===2)add(rod([0,.85,0],[0,1.12,0],.025),'metal',a);break;
  }
  case 'folio':{
   if(v===0){add(rod([0,.07,-.35],[0,.07,.35],.045),'dark','none',true);
    for(const side of [-1,1]){const a=motion('book',{side});add(box([side*.20,.055,0],[.40,.05,.74]),'cloth',a);add(box([side*.20,.092,0],[.36,.03,.67]),'bone',a,true);
     for(let row=0;row<6;row++)add(rod([side*.05,.112,-.23+row*.09],[side*(row%3===0?.30:.34),.112,-.23+row*.09],.005),'dark',a,true);}
   }else if(v===1){add(grid(10,12,(t,u)=>[(u-.5)*.76,.06+.045*Math.cos((u-.5)*Math.PI),(t-.5)*.64]),'bone',motion('paper'),true);for(const side of [-1,1])add(rod([side*.39,.08,-.38],[side*.39,.08,.38],.06),'bone');for(let i=0;i<4;i++)add(tube(t=>[-.3+t*.6,.115,-.22+i*.13+.04*Math.sin(t*TAU)],()=>.006,16,5),'accent',motion('paper'));}
   else{add(box([0,.03,0],[.57,.07,.73]),'bone');add(box([0,.08,0],[.50,.02,.57]),'cloth');add(box([0,.12,.32],[.16,.04,.07]),'metal');for(let i=0;i<5;i++)add(rod([-.17,.099,-.20+i*.09],[.16,.099,-.20+i*.09],.005),'dark','none',true);add(rod([.36,.1,-.26],[.36,.1,.25],.023),'bone');}break;
  }
  case 'bowrig':{
   if(v===2){add(rod([0,.08,0],[0,.75,0],.16),'cloth');add(ring(.17,.78),'metal');for(let i=0;i<5;i++){const x=(i%3-1)*.07,z=Math.floor(i/3)*.09-.04;add(rod([x,.15,z],[x,1.2+(i%2)*.06,z],.012),'bone');add(prism([[x-.04,.95],[x-.04,1.1],[x+.02,1.14],[x+.02,1]],.016),'accent');}break;}
   const span=v===1?1.2:.9;for(const side of [-1,1]){const a=motion('bow',{side});add(tube(t=>[0,side*t*span,.06+.25*Math.sin(t*Math.PI/2)-(v===1?.10:0)*Math.sin(t*Math.PI)],t=>.055*(1-t)+.017,28,9),'bone',a);add(rod([0,0,0],[0,side*span,.31],.009),'dark',motion('string',{side,span}),true);}
   add(rod([0,-.12,.06],[0,.12,.06],.07),'dark','none',true);break;
  }
  case 'utilitybelt':{
   const path=t=>[(t-.5)*1.0,.03-.25*Math.pow((t-.5)*2,2),0];add(tube(path,()=>.065,24,8),'cloth');add(box([0,.11,0],[.14,.035,.12]),'metal');
   for(const s of [-1,1]){if(v===1)for(let i=0;i<3;i++){add(rod([s*(.18+i*.1),.08,-.08],[s*(.18+i*.1),.08,-.30],.042),'bone');add(sphere([s*(.18+i*.1),.08,-.34],[.04,.04,.035],6,10),'metal');}
    else {add(box([s*.33,.12,-.14],[.28,.22,v===2?.46:.31]),'cloth');add(box([s*.33,.24,-.08],[.055,.025,.28]),'dark','none',true);if(v===2)add(rod([s*.18,.14,-.43],[s*.49,.14,-.43],.10),'bone');}}
   break;
  }
  case 'mantle':{
   const point=(t,u)=>{const w=(v===2?.19:.54)*(1+t*.30),notch=v===1?.24*Math.exp(-Math.pow((u-.5)/.14,2))*t*t:0;return [(u*2-1)*w,.10+.08*t+.035*Math.sin(u*Math.PI),.13-t*(v===2?1.6:1.15)+notch];};
   add(grid(20,20,point),'cloth',motion('cloth'));for(const u of [0,1])add(tube(t=>point(t,u),()=>.017,24,6),'accent',motion('cloth'));add(rod([-.34,.08,.13],[.34,.08,.13],.027),'bone');break;
  }
  default:throw new Error('Unknown field part: '+p.type);
 }
}
export function prepareFieldMotion(a,p,time,pose={}){
 if(a.mode!=='leg')return null;
 const root=scaled(a.root,p),knee=scaled(a.knee,p),foot=scaled(a.foot,p),f=p.flex*(pose.layers?.flex??1),rate=pose.rate??0;
 const phase=TAU*(time*rate+p.phase+(p.mirrorSide===-1?(pose.phaseLag??.5):0)),gain=Math.min(1.5,Math.abs(pose.stride??0))*f;
 const target=[foot[0],foot[1]-Math.max(0,Math.sin(phase))*(pose.lift??.2)*p.size*f,foot[2]+Math.cos(phase)*.38*p.size*gain];
 if(rate<.001||f===0)return {a:a.bone===0?root:knee,b:a.bone===0?knee:foot,c:a.bone===0?root:knee,d:a.bone===0?knee:foot};
 const result=solveTwoBone(root,target,Math.hypot(...knee.map((v,i)=>v-root[i])),Math.hypot(...foot.map((v,i)=>v-knee[i])),[0,0,-1]);
 return a.bone===0?{a:root,b:knee,c:root,d:result.knee}:{a:knee,b:foot,c:result.knee,d:result.foot};
}
export function animateFieldVertex(a,point,p,time,pose={},prepared=null){
 const s=p.size,l=s*p.length,f=p.flex*(pose.layers?.flex??1),phase=time*TAU+p.phase*TAU,pull=pose.action?.name==='bowdraw'?bowPull(pose.action.phase)*pose.action.weight:0;let [x,y,z]=point;if(f===0)return point;
 switch(a.mode){
  case 'leg':{const q=prepared||prepareFieldMotion(a,p,time,pose);return mapSegment(point,q.a,q.b,q.c,q.d);}
  case 'tail':x+=Math.sin(time*2.2-y/l*1.6+p.phase*TAU)*Math.pow(Math.max(0,y/l),1.4)*.17*s*f*(pose.tail??.6);break;
  case 'lamp':return rotate(point,'z',Math.sin(time*1.5+p.phase*TAU)*.09*f);
  case 'book':return rotate(point,'z',a.side*(.12+.12*Math.sin(time*.9))*f);
  case 'paper':y+=Math.sin(time*1.6+z/l*3)*.008*s*f;break;
  case 'bow':z-=Math.abs(y/l)*.045*f*pull;break;
  case 'string':{const t=Math.min(1,Math.abs(y/l)/a.span);z-=.30*l*(1-t)*f*pull;break;}
  case 'cloth':{const t=clamp((.13-z/s)/1.3,0,1);y+=Math.sin(time*2+x/s*3-t*3+p.phase*TAU)*.065*l*t*f;break;}
 }
 return [x,y,z];
}
export function fieldSupportPoints(p){if(p.type!=='beastleg')return [];return [[0,1.225,0],[0,1.18,-.25]].map(q=>scaled(q,p));}
