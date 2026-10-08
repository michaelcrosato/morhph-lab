import {grid,sphere,tube,rod,rotated,translated,rotate,reverseWinding} from './parametric-mesh.js';
import {solveTwoBone} from './ik.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const behavior=(mode,fields={})=>({pack:'bloom',mode,...fields});
const add3=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(v,p)=>[v[0]*p.size,v[1]*p.size*p.length,v[2]*p.size];
const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
/** Place a rigid segment between two sampled joints. The source is never changed. */
export function mapSegment(point,a,b,c,d){
  const u=unit(sub(b,a)),v=unit(sub(d,c)),cos=u.reduce((s,x,i)=>s+x*v[i],0);let q;
  if(cos<-.999999){const axis=unit(cross(u,Math.abs(u[0])<.8?[1,0,0]:[0,1,0]));q=[...axis,0];}
  else {q=[...cross(u,v),1+cos];const n=Math.hypot(...q);q=q.map(x=>x/n);}
  const p=sub(point,a),t=cross(q.slice(0,3),p).map(x=>x*2),r=add3(p,add3(t.map(x=>x*q[3]),cross(q.slice(0,3),t)));
  return add3(c,r);
}
/** +Y is the attachment normal. All models use indexed, generated triangles. */
export function buildBloomPart(p,add){
  const v=p.variant;
  switch(p.type){
    case 'legbank':{
      const count=3+v,span=1.9;
      add(rod([0,0,-span/2],[0,0,span/2],.085),'armor');
      for(let i=0;i<count;i++){
        const z=(i/(count-1)-.5)*span,root=[0,0,z],knee=[0,.40,z+.24],foot=[0,.84,z-.10],common={root,knee,foot,phase:i/count};
        add(rod(root,knee,.06),'armor',behavior('leg',{...common,bone:0}));
        add(sphere(knee,[.09,.09,.09],8,12),'accent',behavior('leg',{...common,bone:0}));
        add(rod(knee,foot,.044),'bone',behavior('leg',{...common,bone:1}));
        add(sphere(foot,[.09,.09,.15],8,12),'armor',behavior('leg',{...common,bone:1}));
        add(sphere(root,[.115,.08,.115],8,12),'armor');
      }break;
    }
    case 'plateband':{
      const count=[5,7,9][v];
      for(let i=0;i<count;i++){
        const z=(i/(count-1)-.5)*2.35,a=behavior('plate',{pivot:[0,.025,z+.24],phase:i/count}),w=.68*(.78+.22*Math.sin(i/(count-1)*Math.PI));
        const point=(t,u)=>{const dome=Math.pow(Math.max(0,Math.sin(u*Math.PI)),.7),x=(u*2-1)*w*(.94+.06*Math.sin(t*Math.PI));return [x,-.28+.38*dome+.065*Math.sin(t*Math.PI),z+(t-.5)*.70+(v===2?.035*Math.cos(u*TAU*4)*t*t:0)];};
        add(grid(12,18,point),'armor',a);
        add(tube(u=>point(.95,u),()=>.024,22,6),'accent',a);
        if(v===2)add(tube(t=>point(t,.5),()=>.035,12,6),'bone',a);
      }break;
    }
    case 'petalcrown':{
      const count=[5,7,9][v];
      add(sphere([0,.12,0],[.33,.15,.33],12,18),'accent');
      for(let i=0;i<count;i++){
        const angle=i/count*TAU,a=behavior('petal',{phase:i/count,angle}),point=(t,u)=>{
          const r=.18+t*1.22,width=.48*Math.pow(Math.max(0,Math.sin(t*Math.PI)),.65)*(u*2-1),height=.13+.48*t*t-.12*Math.sin(u*Math.PI)*Math.sin(t*Math.PI);
          return [Math.cos(angle)*r-Math.sin(angle)*width,height,Math.sin(angle)*r+Math.cos(angle)*width];
        };
        add(grid(22,12,point),i%2?'skin':'membrane',a);
        add(tube(t=>point(t,.5),t=>.025*(1-t)+.006,22,6),'accent',a);
      }break;
    }
    case 'valvepair':{
      for(const side of [-1,1]){
        const a=behavior('valve',{side});
        const point=(t,u)=>{const angle=(u-.5)*Math.PI,rad=t*(v===1?1.22:1.45),width=v===2?.64:1.0,rib=1+(v===0?.045:.018)*Math.cos(u*TAU*12);return [Math.sin(angle)*rad*width,Math.cos(angle)*rad,side*(.045+.22*Math.sin(t*Math.PI/2)*Math.cos(angle))*rib];};
        const shell=grid(22,36,point);add(side===1?shell:reverseWinding(shell),'armor',a);
        for(let i=1;i<12;i++)add(tube(t=>{const q=point(t,i/12);q[2]+=side*.014;return q;},()=>.014,24,6),'accent',a);
        add(tube(u=>point(1,u),()=>.031,40,7),'bone',a);
      }
      add(sphere([0,.08,0],[.27,.12,.15],10,18),'skin');break;
    }
    case 'tubecluster':{
      const count=[7,11,15][v];
      for(let i=0;i<count;i++){
        const angle=i*2.399963229728653,r=i===0?0:.15+.30*Math.sqrt(i/(count-1)),x=Math.cos(angle)*r,z=Math.sin(angle)*r,height=.58+.19*Math.sin(i*2.1),a=behavior('pad',{pivot:[x,0,z],height,phase:i/count});
        add(tube(t=>[x,t*height,z],t=>.054-.015*t,12,8),'skin',a);
        add(grid(8,18,(t,u)=>{const rad=.044+t*.10;return [x+Math.cos(u*TAU)*rad,height-.045+Math.sin(t*Math.PI/2)*.07,z+Math.sin(u*TAU)*rad];}),'accent',a);
        add(sphere([x,height-.035,z],[.05,.012,.05],6,10),'dark',a,true);
      }break;
    }
    case 'irismouth':{
      const count=[6,8,10][v];
      add(tube(t=>[Math.cos(t*TAU)*.57,.10,Math.sin(t*TAU)*.57],()=>.085,48,9),'armor');
      for(let i=0;i<count;i++){
        const angle=i/count*TAU,a=behavior('iris',{angle,pivot:[Math.cos(angle)*.50,.10,Math.sin(angle)*.50],phase:i/count});
        add(grid(10,8,(t,u)=>{const r=.50-t*.30,theta=angle+t*.52+(u-.5)*TAU/count*1.25;return [Math.cos(theta)*r,.11+.045*t,Math.sin(theta)*r];}),'bone',a);
      }
      add(sphere([0,-.04,0],[.48,.06,.48],12,20),'dark','none',true);break;
    }
    case 'latticecage':{
      const curve=(t,u)=>{const angle=u*TAU,rad=v===2?.20+.82*(1-Math.abs(t*2-1)):.22+.66*Math.sin(t*Math.PI)*(v===1?1+t*.28:1);return [Math.cos(angle)*rad,t*1.8,Math.sin(angle)*rad];};
      const a=behavior('basket');
      for(let i=0;i<12;i++)for(const sign of [-1,1])add(tube(t=>curve(t,i/12+sign*t*.18),()=>.023,32,6),i%3?'armor':'accent',a);
      for(let j=0;j<=6;j++)add(tube(u=>curve(j/6,u),()=>j===0||j===6?.045:.019,40,6),'bone',a);
      add(sphere([0,.88,0],[.24,.37,.24],14,20),'glow',a);break;
    }
    case 'whiskerfan':{
      const count=[7,11,15][v];
      for(let i=0;i<count;i++){
        const a=(i/(count-1)-.5)*2.2,span=1.25+.45*Math.sin(i/(count-1)*Math.PI),motion=behavior('whisker',{phase:i/count});
        add(tube(t=>[Math.sin(a)*t*span,.07+Math.cos(a)*t*span,.25*t*t],t=>.025*(1-t)+.003,26,6),i%3?'bone':'accent',motion);
        if(v===2)add(sphere([Math.sin(a)*span,.07+Math.cos(a)*span,.25],[.025,.025,.025],6,8),'glow',motion);
      }
      add(sphere([0,.03,0],[.21,.09,.15],10,14),'skin');break;
    }
    case 'trunk':{
      const a=behavior('trunk'),span=1.8,width=v===1?.26:.20;
      const curve=t=>[0,t*span,0],radius=t=>width*(1-.55*t);
      add(tube(curve,radius,36,14),'skin',a);
      for(let i=1;i<=9;i++){const t=i/10,r=radius(t)*1.03;add(tube(u=>[Math.cos(u*TAU)*r,t*span,Math.sin(u*TAU)*r],()=>.015,20,6),'accent',a);}
      if(v===2)for(const sign of [-1,1])add(tube(t=>[sign*t*.19,span+t*.4,0],t=>.08*(1-t)+.012,14,9),'skin',a);
      else {add(tube(u=>[Math.cos(u*TAU)*.12,span,Math.sin(u*TAU)*.12],()=>.035,24,8),'bone',a);add(sphere([0,span-.018,0],[.1,.025,.1],8,12),'dark',a,true);}
      break;
    }
    case 'faceplate':{
      add(grid(18,24,(t,u)=>{const x=(u-.5)*1.1,y=(t-.5)*1.2,edge=Math.sqrt(Math.max(.01,1-Math.pow(u*2-1,2)));return [x,.12+.25*edge*Math.sin(t*Math.PI)+(v===0?Math.max(0,.5-t)*.55:0),y*(v===2?1.0+.2*Math.cos(u*TAU*3):1)];}),'armor');
      for(const side of [-1,1]){add(sphere([side*.22,.37,.15],[v===1?.19:.13,.023,v===1?.035:.10],10,14),'dark','none',true);add(rod([side*.09,.4,.3],[side*.42,.3,.25],.035),'bone');}
      if(v===2)for(const side of [-1,1])add(tube(t=>[side*(.48-t*.2),.12+t*.04,-.3-t*.6],t=>.065*(1-t)+.008,16,7),'accent');
      break;
    }
    default:throw new Error('Unknown Carapace & Bloom part: '+p.type);
  }
}
/** Prepare rigid joint frames once per segment, not once per vertex. */
export function prepareBloomMotion(a,p,time,pose={}){
  if(a.mode!=='leg')return null;
  const root=scale(a.root,p),knee=scale(a.knee,p),foot=scale(a.foot,p),flex=p.flex*(pose.layers?.flex??1),phase=TAU*(time*(pose.wingRate||1)+(p.phase||0)+a.phase),strength=clamp(pose.stepBank??0,0,2)*flex;
  const target=[foot[0],foot[1]-Math.max(0,Math.sin(phase))*.18*p.size*p.length*strength,foot[2]+Math.cos(phase)*.20*p.size*strength];
  const result=solveTwoBone(root,target,Math.hypot(...sub(knee,root)),Math.hypot(...sub(foot,knee)),[0,0,1]);
  return a.bone===0?{a:root,b:knee,c:root,d:result.knee}:{a:knee,b:foot,c:result.knee,d:result.foot};
}
export function animateBloomVertex(a,point,p,time,pose={},prepared=null){
  const flex=p.flex*(pose.layers?.flex??1);if(flex===0)return point;
  const size=p.size,length=size*p.length,phase=TAU*(time*(pose.wingRate||1)+(p.phase||0)+(a.phase||0)),gain=k=>clamp(pose[k]??0,0,2);
  let [x,y,z]=point;
  const hinge=(axis,angle,pivot=[0,0,0])=>{const origin=scale(pivot,p);return add3(rotate(sub([x,y,z],origin),axis,angle*flex),origin);};
  switch(a.mode){
    case 'leg':{const q=prepared||prepareBloomMotion(a,p,time,pose);return mapSegment(point,q.a,q.b,q.c,q.d);}
    case 'plate':return hinge('x',Math.sin(phase)*(.035+.11*Math.max(gain('fold'),gain('stepBank'))),a.pivot);
    case 'petal':{const r=Math.hypot(x,z)/Math.max(.001,size),curl=(.5+.5*Math.sin(phase))*.55*gain('bloom')*flex,close=1-curl*.35; x*=close;z*=close;y+=r*r*.55*curl*length;break;}
    case 'valve':return hinge('x',a.side*(.12+(.5+.5*Math.sin(phase))*.70*gain('valve')));
    case 'pad':{const origin=scale(a.pivot,p),k=1-(.5+.5*Math.sin(phase))*.38*gain('pad')*flex;y*=Math.max(.25,k);x=origin[0]+(x-origin[0])*(1+(1-k)*.25);z=origin[2]+(z-origin[2])*(1+(1-k)*.25);break;}
    case 'iris':return hinge('y',Math.sin(phase-(a.phase||0)*TAU)*(.1+.4*Math.max(gain('reach'),gain('valve'))),a.pivot);
    case 'basket':return hinge('z',Math.sin(phase*.3)*.025);
    case 'whisker':return hinge('z',Math.sin(phase)*(.025+.19*gain('sense')));
    case 'trunk':{const k=(.12+.35*gain('reach'))*Math.sin(phase)*flex/Math.max(.001,length),angle=y*k;
      if(Math.abs(k)>.00001){x=x*Math.cos(angle)+(1-Math.cos(angle))/k;y=Math.sin(angle)/k-point[0]*Math.sin(angle);}
      z+=Math.sin(phase*.5-y/Math.max(.001,length))*y*.04*gain('reach')*flex;break;}
  }
  return [x,y,z];
}

/** Conservative rest-foot samples for the stabilized ground controller.
 * These points set a fixed clearance only. They are not contacts or colliders.
 */
export function bloomSupportPoints(p){
  let points=[];
  if(p.type==='legbank')points=Array.from({length:3+p.variant},(_,i)=>[0,.84,(i/(2+p.variant)-.5)*1.9-.1]);
  if(p.type==='tubecluster')points=Array.from({length:[7,11,15][p.variant]},(_,i)=>{const count=[7,11,15][p.variant],a=i*2.399963229728653,r=i===0?0:.15+.30*Math.sqrt(i/(count-1));return [Math.cos(a)*r,.58+.19*Math.sin(i*2.1)+.025,Math.sin(a)*r];});
  return points.map(v=>scale(v,p).map((n,i)=>i===0&&p.mirrorSide===-1?-n:n));
}
