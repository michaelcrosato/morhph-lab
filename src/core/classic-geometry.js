/** Original attachment families, now expressed as immutable, engine-free plans.
 * Shapes retain their gene IDs, dimensions, and variants. Triangulation is new.
 * Animation starts from rest data. Protected eye and mouth details retain color.
 */
import {grid,sphere,tube,rod,rotate,rotated,translated,merge} from './parametric-mesh.js';
const TAU=Math.PI*2;
const behavior=(mode,extra={})=>({pack:'classic',mode,...extra});
const ellipsoid=(c,s)=>sphere(c,s,12,20);
const ring=(r,thickness,yscale=1)=>tube(t=>[Math.cos(t*TAU)*r,0,Math.sin(t*TAU)*r*yscale],()=>thickness,32,8);
const cone=(a,b,r)=>tube(t=>a.map((x,i)=>x+(b[i]-x)*t),t=>r*(1-t)+.001,8,10);
const fan=points=>grid(points.length-1,6,(v,u)=>{const k=Math.min(points.length-2,Math.floor(v*(points.length-1))),f=v*(points.length-1)-k;return points[k].map((x,i)=>(x+(points[k+1][i]-x)*f)*u);});
export function buildClassicPart(p,add){
 const v=p.variant,side=(p.side||1)*(p.mirrorSide??1);
 switch(p.type){
  case 'eye':{
   add(rod([0,0,0],[0,.30,0],.115),'skin');
   const eye=behavior('eye'),pupil=behavior('pupil');
   add(ellipsoid([0,.255,0],[.28,.21,.28]),'skin',eye);
   add(ellipsoid([0,.365,.01],[.25,.21,.25]),'eye',eye,true);
   add(ellipsoid([0,.547,.015],[.155,.035,.155]),'iris',pupil,true);
   add(ellipsoid([0,.57,.02],[v===1?.035:.078,.026,v===2?.05:.115]),'pupil',pupil,true);
   add(ellipsoid([-.045,.59,.064],[.041,.015,.043]),'glint',pupil,true);break;
  }
  case 'horn':{
   add(tube(t=>[side*(.18+v*.12)*t*t,.95*t,-(.34+p.bend*.3)*t*t],t=>.22*Math.pow(1-t,.85)+.003,28,14),'bone');break;
  }
  case 'tail':{
   const count=8+v;
   for(let i=0;i<count;i++){
    const radius=.24*Math.pow(1-i/(9+v),1.15),a=behavior('chain',{i,step:.255,club:false}),mat=i<6?'skin':'accent';
    add(translated(tube(t=>[0,t*.28,0],t=>radius+(Math.max(.008,radius-.036)-radius)*t,2,12),[0,i*.255,0]),mat,a);
    add(ellipsoid([0,i*.255,0],[radius,radius,radius]),mat,a);
   }break;
  }
  case 'fin':{
   const height=t=>Math.pow(Math.max(0,Math.sin(t*Math.PI)),.8)*(.9+v*.16);
   add(grid(16,6,(t,u)=>[0,u*(height(t)+.025),(t-.5)*1.45]),'membrane',behavior('fin'));
   for(let i=1;i<8;i++){const t=i/8,z=(t-.5)*1.45;add(rod([0,0,z],[0,height(t),z],.022),'skin',behavior('fin'));}break;
  }
  case 'mouth':{
   const a=behavior('mouth');add(ellipsoid([0,.035,0],[.32,.07,.19]),'dark',a,true);
   add(translated(ring(.265,.055,.68),[0,.055,0]),'skin',a);
   for(let i=0;i<6+v*2;i++){const t=i/(6+v*2)*TAU,x=Math.cos(t)*.21,z=Math.sin(t)*.13;add(cone([x,.073,z],[x*.52,.073,z*.52],.041),'accent',a);}break;
  }
  case 'wing':{
   const reach=1+v*.16,points=[[0,.2,-.65],[0,1.25,-1.05],[0,1.9,-.63],[0,2.1,.18],[0,1.35,.82],[0,.28,.44]].map(q=>[0,q[1]*reach,q[2]]),a=behavior('wing');
   add(fan(points),'membrane',a);for(const q of points)add(rod([0,0,0],q,.035),'skin',a);break;
  }
  case 'tentacle':case 'antenna':{
   const antenna=p.type==='antenna',length=antenna?1.05+v*.22:1.7+v*.24,radius=antenna?.045:.2,a=behavior('tube',{length,antenna});
   add(tube(t=>[p.bend*t*t*.45,t*length,0],t=>radius*Math.pow(1-t,.8)+.012,28,12),'skin',a);
   if(antenna){const r=.12+v*.035;add(ellipsoid([p.bend*.45,length,0],[r,r,r]),'glow',behavior('tube-tip',{length,antenna:true}));}break;
  }
  case 'shell':{
   add(grid(16,28,(t,u)=>[.82*Math.sin(t*Math.PI/2)*Math.cos(u*TAU),(.4+v*.08)*Math.cos(t*Math.PI/2),1.04*Math.sin(t*Math.PI/2)*Math.sin(u*TAU)]),'armor');
   add(translated(ring(.84,.055,1.25),[0,.015,0]),'accent');
   for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++){const x=col*.39,z=row*.47,y=.4*Math.sqrt(Math.max(.08,1-x*x/.7-z*z/1.1));add(translated(rotated(ellipsoid([0,0,0],[.24,.07,.28]),'z',-col*.18),[x,y,z]),'armor');}break;
  }
  case 'mandible':{
   const a=behavior('mandible'),curve=t=>[side*(.08+t*t*(.4+p.bend*.15)),t*.85,0];
   add(tube(curve,t=>.14*(1-t)+.01,20,10),'armor',a);
   for(let i=1;i<=4+v;i++){const q=curve(i/(6+v));q[0]-=side*.06;add(cone(q,[q[0]-side*.18,q[1],q[2]],.06),'accent',a);}break;
  }
  case 'crest':{
   add(ellipsoid([0,.06,0],[.16,.12,.8]),'skin');for(let i=0;i<5+v;i++){const u=i/(4+v),h=.35+Math.sin(u*Math.PI)*.55;add(translated(tube(t=>[p.bend*t*t*.18,t*h,-t*t*.17],t=>.11*(1-t)+.002,16,10),[0,.04,(u-.5)*1.35]),'accent');}break;
  }
  case 'clubtail':{
   for(let i=0;i<6;i++){const r=.18-i*.014;add(ellipsoid([0,i*.24+.12,0],[r,.19,r]),'skin',behavior('chain',{i,step:.24,club:true}));}
   const a=behavior('chain',{i:5,step:.24,club:true});add(ellipsoid([0,1.6,0],[.34,.43,.34]),'armor',a);
   for(let i=0;i<6+v*2;i++){const angle=i/(6+v*2)*TAU,x=Math.cos(angle),z=Math.sin(angle);add(cone([x*.27,1.64,z*.27],[x*.55,1.70,z*.55],.09),'accent',a);}break;
  }
  case 'frill':{
   const points=[];for(let i=0;i<=16;i++){const angle=-1.25+i/16*2.5,r=.9+(i%2?-.12:0)+v*.1;points.push([Math.sin(angle)*r,Math.cos(angle)*r,.04]);}
   const a=behavior('frill');add(fan(points),'membrane',a);for(let i=0;i<points.length;i+=2)add(rod([0,0,0],points[i],.022),'accent',a);break;
  }
  case 'claw':{
   add(ellipsoid([0,.25,0],[.15,.32,.15]),'skin');for(const s of [-1,1])add(translated(tube(t=>[s*Math.sin(t*Math.PI)*(.25+v*.04),t*.66,0],t=>.14*(1-t)+.008,20,10),[s*.07,.48,0]),'armor',behavior('claw',{side:s}));break;
  }
  case 'gill':{
   add(rod([0,0,0],[0,.6,0],.045),'skin');for(let i=0;i<5+v;i++){const s=.7-i*.06,points=[[s*.55,s*.4,0],[s*.75,s,0],[0,s*.7,0],[-s*.75,s,0],[-s*.55,s*.4,0]];add(translated(fan(points),[0,.09*i,0]),'membrane',behavior('gill',{i}));}break;
  }
  default:throw new Error('Unknown classic part '+p.type);
 }
}
/** Cache transforms once per moving range, not once per vertex. */
export function prepareClassicMotion(a,p,time,pose={}){
 const f=p.flex??1,layer=k=>pose.layers?.[k]??1,phase=time*TAU+(p.phase??0)*TAU,side=(p.side||1)*(p.mirrorSide??1);
 if(a.mode==='chain'){
  const angles=[];for(let j=0;j<=a.i;j++)angles.push(a.club?
   [(.035+p.bend*.07)*f,Math.sin(time*1.6-j*.6+p.phase*TAU)*.14*f*(pose.tail??.6)*layer('tail')]:
   [(.045+Math.sin(time*1.3-j*.5+p.phase*TAU)*.11*layer('tail')+p.bend*.05)*f,Math.sin(time*(1.6+(pose.speed??0)*.2)-j*.58+p.phase*TAU)*(.16+(pose.speed??0)*.018)*(pose.tail??1)*layer('tail')*f]);return {angles};
 }
 if(a.mode==='eye'||a.mode==='pupil'){
  const t=time+p.phase*4.9,blink=Math.max(0,1-Math.abs((((t+side*.035)%4.9+4.9)%4.9)-4.55)/.11);
  return {blink:1-blink*.92*Math.min(1,layer('blink')*f),dx:Math.sin(t*.65)*.022*layer('gaze')*f,dz:Math.sin(t*.4)*.015*layer('gaze')*f};
 }
 return {f,phase};
}
export function animateClassicVertex(a,point,p,time,pose={},prepared={}){
 const s=p.size,l=s*p.length,f=p.flex??1,layer=k=>pose.layers?.[k]??1,side=(p.side||1)*(p.mirrorSide??1);
 // All coordinates below are rest units. Apply nonuniform gene scale afterwards.
 let q=[point[0]/s,point[1]/l,point[2]/s];if(f===0)return point;
 const hinge=(axis,angle,pivot=[0,0,0])=>rotate(q.map((x,i)=>x-pivot[i]),axis,angle).map((x,i)=>x+pivot[i]);
 switch(a.mode){
  case 'eye':case 'pupil':q[2]*=prepared.blink;if(a.mode==='pupil'){q[0]+=prepared.dx;q[2]+=prepared.dz*prepared.blink;}break;
  case 'chain':{
   q[1]-=a.i*a.step;
   for(let j=a.i;j>=0;j--){const [x,z]=prepared.angles[j];q=rotate(rotate(q,'z',z),'x',x);if(j>0)q[1]+=a.step;}break;
  }
  case 'fin':q[0]+=Math.sin(time*2.3+q[2]*3+p.phase*TAU)*q[1]*.075*layer('flex')*f;break;
  case 'mouth':q[2]*=1+Math.sin(time*2.2+p.phase*TAU)*(.06+(pose.speed??0)*.03+(pose.jaw??0))*layer('jaw')*f;break;
  case 'wing':{
   const flap=(pose.flap??.3)*layer('flex')*f;q[0]+=Math.sin(time*5.5+q[2]*2)*.035*flap*q[1];q=rotate(q,'z',side*(Math.sin(time*5.5+p.phase*TAU)*.5*flap+p.bend*.3*f));break;
  }
  case 'tube':case 'tube-tip':{
   const u=a.mode==='tube-tip'?1:Math.max(0,Math.min(1,q[1]/a.length)),t=time*(a.antenna?1.3:1.6)+p.phase*TAU,amp=(a.antenna?.19:.4)*f*layer('flex');q[0]+=Math.sin(t-u*4.5)*u*u*amp;q[1]-=.1*u*u*amp;q[2]+=Math.cos(t*.8-u*4)*u*u*amp*.6;break;
  }
  case 'mandible':q=rotate(q,'z',-side*(.12+Math.sin(time*2.4+p.phase*TAU)*.18*(pose.jaw??.4)*layer('jaw'))*f);break;
  case 'frill':q[0]*=1+Math.sin(time*1.8+p.phase*TAU)*.12*f*layer('flex');q=rotate(q,'x',(p.bend*.45+Math.sin(time*1.5)*.12*layer('flex'))*f);break;
  case 'claw':q=hinge('z',a.side*(p.bend*.2+(.08+Math.sin(time*2+p.phase*TAU)*.11)*layer('jaw'))*f,[a.side*.07,.48,0]);break;
  case 'gill':q=hinge('x',((a.i-2)*.12+Math.sin(time*2.1+a.i*.7+p.phase*TAU)*.1*layer('breath'))*f,[0,.09*a.i,0]);q=hinge('y',((a.i-2)*.18+p.bend*.4)*f,[0,.09*a.i,0]);break;
 }
 return [q[0]*s,q[1]*l,q[2]*s];
}
