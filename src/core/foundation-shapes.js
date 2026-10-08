/** Shared foundation detail plan. Both the game and the review compiler consume
 * these nodes. It contains no renderer, DOM, texture image, or physics objects. */
import {humanoidLayout} from './humanoid.js';
export function humanoidDetailPlan(rig){
  const p=rig.proportions,l=humanoidLayout(rig),s=p.scale,nodes=[],fingers=[],eyes=[];
  const add=(parent,kind,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],extra={})=>{const n={id:'detail-'+nodes.length,parent,kind,position,scale,rotation,...extra};nodes.push(n);return n;};
  const mesh=(parent,material,position,scale,geometry='sphere',socket=null)=>add(typeof parent==='string'?parent:parent.id,'mesh',position,scale,[0,0,0],{material,geometry,socket});
  const group=(parent,position=[0,0,0])=>add(typeof parent==='string'?parent:parent.id,'group',position);
  function segment(bone,length,radius,material,socket){
    mesh(bone,material,[0,-length*.48,0],[radius,length*.57,radius*.90],'sphere',socket);
    mesh(bone,'skin',[0,0,0],[radius*.98,radius*.98,radius*.98],'sphere',socket);
  }
  for(const side of [1,-1]){
    const end=side>0?'.L':'.R',arm='upperArm'+end,fore='forearm'+end,hand='hand'+end,thigh='upperLeg'+end,shin='shin'+end,foot='foot'+end;
    segment(arm,l.upperArm,l.armRadius,'skin','upperArm');segment(fore,l.forearm,l.armRadius*.82,'skin','forearm');
    segment(thigh,l.thigh,l.thighRadius,rig.outfit==='wrap'?'skin':'dark','upperLeg');segment(shin,l.shin,l.thighRadius*.73,'skin','shin');
    mesh(foot,'dark',[0,-.025*s,.105*p.feet*s],[.145*p.feet*s,l.footHeight,.28*p.feet*s],'sphere','foot');
    mesh(foot,'accent',[0,.055*s,.015*s],[.14*p.feet*s,.16*s,.135*p.feet*s]);
    mesh(hand,'skin',[0,-l.hand*.38,.005*s],[.098*p.hands*s,l.hand*.57,.065*p.hands*s],'sphere','hand');
    const count=rig.handStyle==='stone'?3:4;
    for(let i=0;i<count;i++){
      const hinge=group(hand,[(i-(count-1)/2)*.049*p.hands*s,-l.hand*.80,.009*s]);
      const length=(.125-Math.abs(i-(count-1)/2)*.017)*p.hands*s;
      const f=mesh(hinge,'skin',[0,-length*.40,0],[.023*p.hands*s,length*.57,.025*p.hands*s],'sphere','hand');f.socketBone=hand;
      if(rig.handStyle==='claws'){const claw=mesh(hinge,'dark',[0,-length*.91,.014*s],[.019*s,.076*p.hands*s,.019*s],'cone');claw.rotation[0]=Math.PI-.3;}
      fingers.push({id:hinge.id,side,index:i,base:0});
    }
    const thumb=group(hand,[-side*.088*p.hands*s,-l.hand*.16,.005*s]);thumb.rotation[2]=-side*.50;
    mesh(thumb,'skin',[0,-.067*p.hands*s,.018*s],[.033*p.hands*s,.081*p.hands*s,.032*p.hands*s]);fingers.push({id:thumb.id,side,index:4,base:0});
    if(rig.outfit==='armor'||rig.outfit==='carapace'){
      mesh(arm,'armor',[side*.025*s,-.03*s,0],[l.armRadius*1.65,.20*s,l.armRadius*1.4]);
      mesh(fore,'armor',[0,-l.forearm*.65,.005*s],[l.armRadius*.99,l.forearm*.25,l.armRadius*.96]);
      mesh(shin,'armor',[0,-l.shin*.44,.03*s],[l.thighRadius*.8,l.shin*.35,l.thighRadius*.84]);
    }
  }
  const hs=p.head*s;
  for(const side of [1,-1]){
    const position=[side*.115*hs,.057*hs,.271*hs];
    mesh('head','skin',position,[.091*hs,.069*hs,.057*hs]);const eye=group('head',[...position]);
    mesh(eye,'eye',[0,0,.018*hs],[.073*hs,.048*hs,.04*hs]);const iris=mesh(eye,'iris',[0,0,.053*hs],[.031*hs,.035*hs,.018*hs]);
    mesh(iris,'pupil',[0,0,.65],[.46,.8,.6]);mesh(eye,'glint',[-.012*hs,.014*hs,.070*hs],[.010*hs,.010*hs,.005*hs]);
    const brow=mesh('head','dark',[side*.114*hs,.142*hs,.276*hs],[.096*hs,.020*hs,.028*hs]);brow.rotation[2]=side*-.10;
    mesh('head','skin',[side*.288*hs,-.005*hs,0],[.065*hs,.105*hs,.055*hs]);eyes.push({group:eye.id,iris:iris.id});
  }
  mesh('head','skin',[0,-.005*hs,.316*hs],[.044*hs,.078*hs,.065*hs]);
  mesh('jaw','skin',[0,-.035*hs,.044*hs],[.155*hs,.070*hs,.090*hs]);mesh('jaw','dark',[0,.018*hs,.101*hs],[.111*hs,.015*hs,.010*hs]);
  if(rig.headStyle!=='bare'){
    const material=rig.headStyle==='crest'?'armor':rig.headStyle==='hood'?'accent':'dark';
    mesh('head',material,[0,.025*hs,-.015*hs],[.311*hs,.350*hs,.327*hs],'cap');
    if(rig.headStyle==='hood')for(const side of [-1,1])mesh('head','accent',[side*.278*hs,-.055*hs,-.06*hs],[.065*hs,.27*hs,.27*hs]);
    if(rig.headStyle==='crest')for(let i=0;i<6;i++)mesh('head','accent',[0,.34*hs,-.2*hs+i*.075*hs],[.047*hs,.10*hs,.052*hs]);
  }
  mesh('pelvis','dark',[0,.025*s,0],[.393*p.hips*s,.050*s,.322*Math.pow(p.bulk,.25)*s]);
  mesh('pelvis','armor',[0,.028*s,.326*s],[.068*s,.062*s,.025*s]);
  return {nodes,fingers,eyes};
}
/** Standard latitude/longitude sphere and cap. Winding points outwards.
 * The detail resolution is shared by the game adapter and the review compiler. */
export function foundationPrimitive(kind='sphere'){
  if(kind==='cone')return cone();
  if(!['sphere','cap'].includes(kind))throw new Error('Unknown foundation primitive: '+kind);
  const width=24,height=kind==='cap'?12:16,end=kind==='cap'?Math.PI*.56:Math.PI;
  const positions=[],normals=[],uvs=[],indices=[];
  for(let y=0;y<=height;y++)for(let x=0;x<=width;x++){
    const u=x/width,v=y/height,theta=v*end,phi=u*Math.PI*2;
    const p=[-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta)];
    positions.push(...p);normals.push(...p);uvs.push(u,1-v);
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=y*(width+1)+x+1,b=a-1,c=b+width+1,d=a+width+1;
    if(y!==0)indices.push(a,b,d);
    if(y!==height-1||end<Math.PI)indices.push(b,c,d);
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)};
}
function cone(){
  const positions=[],normals=[],uvs=[],indices=[],n=12;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,k=positions.length/3;
    const p=[Math.sin(a),-.5,Math.cos(a)],q=[Math.sin(b),-.5,Math.cos(b)],tip=[0,.5,0];
    positions.push(...p,...q,...tip,0,-.5,0,...q,...p);
    const nx=Math.sin((a+b)/2),nz=Math.cos((a+b)/2),mag=Math.sqrt(2);for(let j=0;j<3;j++)normals.push(nx/mag,1/mag,nz/mag);for(let j=0;j<3;j++)normals.push(0,-1,0);
    uvs.push(0,0,1,0,.5,1,.5,.5,1,0,0,0);indices.push(k,k+1,k+2,k+3,k+4,k+5);
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices)};
}
