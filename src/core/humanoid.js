import {FIELD_MOTION} from './field-motion.js';
import {BLOOM_MOTION} from './bloom-motion.js';
import {FRONTIER_MOTION} from './frontier-motion.js';
import {HUMANOID_CONTENT} from './content-pack.js';
import {clamp,mix} from './math.js';

/** Rig contracts use metres, +Y up, and +Z forward. No renderer dependency. */
export const PROPORTIONS=Object.freeze({
  scale:{label:'Overall scale',min:.7,max:1.45},torso:{label:'Torso length',min:.8,max:1.3},
  shoulders:{label:'Shoulder width',min:.7,max:1.55},hips:{label:'Hip width',min:.7,max:1.4},
  arms:{label:'Arm length',min:.7,max:1.4},legs:{label:'Leg length',min:.75,max:1.35},
  head:{label:'Head size',min:.75,max:1.35},bulk:{label:'Body mass',min:.65,max:1.65},
  hands:{label:'Hand size',min:.65,max:1.5},feet:{label:'Foot size',min:.7,max:1.45},
  posture:{label:'Forward posture',min:0,max:.45}
});
export const BODY_STYLES=Object.freeze(['classic','defined']);
export const OUTFITS=Object.freeze(['tunic','armor','wrap','carapace']);
export const HEAD_STYLES=Object.freeze(['crest','crop','hood','bare']);
export const HAND_STYLES=Object.freeze(['fingers','claws','stone']);
export const SOCKETS=Object.freeze(['body','head','chest','pelvis','upperArm','forearm','hand','upperLeg','shin','foot']);
export const HUMANOID_MODELS=Object.freeze([
  {id:'wayfarer',label:'Wayfarer',note:'Humanoid · civilian / balanced'},
  {id:'warden',label:'Warden',note:'Humanoid · guard / armored'},
  {id:'ranger',label:'Ranger',note:'Humanoid · scout / long legs'},
  {id:'goblin',label:'Goblin',note:'Humanoid · skirmisher / small'},
  {id:'ogre',label:'Ogre',note:'Humanoid · brute / broad'},
  {id:'revenant',label:'Revenant',note:'Humanoid · stalker / hunched'},
  {id:'golem',label:'Golem',note:'Humanoid · sentinel / stone'},
  {id:'fiend',label:'Fiend',note:'Humanoid · monster / horns and tail'},
  {id:'arcanist',label:'Arcanist',note:'Humanoid · caster / glowing'},...HUMANOID_CONTENT
]);
export function defaultRig(family='creature'){
  if(family==='creature')return {family};
  return {family:'humanoid',proportions:Object.fromEntries(Object.keys(PROPORTIONS).map(k=>[k,k==='posture'?0:1])),outfit:'tunic',headStyle:'crop',handStyle:'fingers',bodyStyle:'classic'};
}
export function validateRig(raw=defaultRig()){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['creature','humanoid'].includes(raw.family))throw new Error('Invalid blueprint: unknown rig family.');
  if(raw.family==='creature')return defaultRig();
  const out=defaultRig('humanoid');
  if(raw.proportions!==undefined&&(!raw.proportions||typeof raw.proportions!=='object'||Array.isArray(raw.proportions)))throw new Error('Invalid blueprint: proportions must be an object.');
  for(const [key,{min,max}] of Object.entries(PROPORTIONS)){
    const v=raw.proportions?.[key]??out.proportions[key];
    if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`Invalid blueprint: ${key} must be between ${min} and ${max}.`);
    out.proportions[key]=v;
  }
  for(const [key,choices] of [['outfit',OUTFITS],['headStyle',HEAD_STYLES],['handStyle',HAND_STYLES],['bodyStyle',BODY_STYLES]]){
    const value=raw[key]??out[key];if(!choices.includes(value))throw new Error('Invalid blueprint: unknown '+key+'.');out[key]=value;
  }
  return out;
}
export function humanoidLayout(rig){
  const p=rig.proportions,s=p.scale;
  const spineY=.25*p.torso*s,chestY=.59*p.torso*s,neckY=chestY+.36*p.torso*s;
  const headY=chestY+((rig.bodyStyle==='defined'?.68:.49)*p.torso+.06*p.head)*s;
  const thigh=.69*p.legs*s,shin=.67*p.legs*s,footHeight=.12*p.feet*s;
  return {scale:s,spineY,chestY,neckY,headY,thigh,shin,footHeight,hipX:.25*p.hips*s,
    shoulderX:(.5*p.shoulders+.055*p.bulk)*s,shoulderY:chestY+.17*p.torso*s,
    upperArm:.55*p.arms*s,forearm:.52*p.arms*s,hand:.19*p.hands*s,
    restHeight:thigh+shin+footHeight-.035*s,headRadius:.29*p.head*s,
    thighRadius:.17*Math.sqrt(p.bulk)*s,armRadius:.125*Math.sqrt(p.bulk)*s};
}
/** The humanoid body graph is derived from proportions. It is not freely edited. */
export function humanoidNodes(rig){
  const p=rig.proportions,l=humanoidLayout(rig),s=p.scale;
  return [
    {id:'core',parent:null,offset:[0,0,0],radii:[.36*p.hips*s,.30*s,.29*Math.pow(p.bulk,.25)*s]},
    {id:'spine',parent:'core',offset:[0,l.spineY,0],radii:[.32*Math.pow(p.bulk,.4)*s,.37*p.torso*s,.29*Math.sqrt(p.bulk)*s]},
    {id:'chest',parent:'spine',offset:[0,l.chestY-l.spineY,0],radii:[.53*p.shoulders*s,.44*p.torso*s,.32*Math.pow(p.bulk,.65)*s]},
    {id:'head',parent:'chest',offset:[0,l.headY-l.chestY,0],radii:[.29*p.head*s,.35*p.head*s,.31*p.head*s]}
  ];
}
export function syncHumanoidBody(genome){if(genome.rig?.family==='humanoid')genome.nodes=humanoidNodes(genome.rig);return genome;}
export function blendRigs(a,b,t){
  if(a.family!==b.family)return structuredClone(t<.5?a:b);
  const out=structuredClone(t<.5?a:b);
  if(out.family==='humanoid')for(const key of Object.keys(PROPORTIONS))out.proportions[key]=mix(a.proportions[key],b.proportions[key],t);
  return out;
}
export function socketBone(socket,side=1){
  if(['upperArm','forearm','hand','upperLeg','shin','foot'].includes(socket))return socket+'.'+(side<0?'R':'L');
  return socket==='pelvis'?'pelvis':socket;
}
export function hostBone(host){return host==='core'?'pelvis':host;}
export function socketRest(rig,socket,side=1){
  const l=humanoidLayout(rig),p=rig.proportions;
  const points={head:[0,l.headY,0],chest:[0,l.chestY,0],pelvis:[0,0,0],
    upperArm:[side*l.shoulderX,l.shoulderY,0],forearm:[side*l.shoulderX,l.shoulderY-l.upperArm,0],
    hand:[side*l.shoulderX,l.shoulderY-l.upperArm-l.forearm,0],upperLeg:[side*l.hipX,0,0],
    shin:[side*l.hipX,-l.thigh,0],foot:[side*l.hipX,-l.thigh-l.shin,0]};
  const radius=socket==='head'?l.headRadius:socket==='chest'?.32*p.scale:socket==='pelvis'?.29*p.scale:.115*p.scale;
  return {position:points[socket]||[0,0,0],radius};
}
export const HUMANOID_LOCOMOTION=Object.freeze(['idle','walk','run','creep','backpedal','strafe','prowl','trot']);
export function compatibilityReport(g){
  const human=g.rig?.family==='humanoid',notes=[],inactive=[];
  if(human){
    for(const p of g.parts)if(p.type==='leg')inactive.push(p.id);
    if(inactive.length)notes.push(`${inactive.length} creature-leg gene(s) are retained but inactive. The humanoid rig supplies two legs.`);
    const unsupported=Object.entries(g.motion.weights).filter(([k,v])=>v>0&&!HUMANOID_LOCOMOTION.includes(k)).map(([k])=>k);
    if(unsupported.length)notes.push('Humanoid locomotion does not use '+unsupported.join(', ')+'. Compatible weights are normalized; zero compatible weight uses idle.');
    if(['sit','defeat','jump','kneel','kick','dodge'].includes(g.motion.humanoid?.action))notes.push('This action changes the visual pose only. The physics controller stays upright.');
  }else{
    if(g.motion.humanoid?.action!=='none'&&g.motion.humanoid?.action)notes.push('Humanoid action is stored but inactive on the creature rig.');
    if(g.parts.some(p=>p.socket&&p.socket!=='body'))notes.push('Joint sockets use their body host on the creature rig.');
  }
  if(g.parts.some(p=>p.type==='legbank'||p.type==='tubecluster'))notes.push('Leg banks and tube feet are animated attachments. On ground creatures, downward mounts set fixed rest clearance only. They do not make terrain contacts. Test clearance.');
  if(g.motion.travel?.medium!=='ground')notes.push('Three-axis arcade travel. Fin and wing dimensions do not change thrust or lift. Body waves do not deform the collision hull.');
  return {family:human?'humanoid':'creature',locomotion:human?[...HUMANOID_LOCOMOTION]:['idle','walk','run','creep','bound','swim','hover','display','backpedal','strafe','prowl','trot','cruise','undulate','jet','row','soar','powerflight','flutter','float',...Object.keys(FRONTIER_MOTION),...Object.keys(BLOOM_MOTION),...Object.keys(FIELD_MOTION)],
    inactiveGenes:inactive,notes,capabilities:{proceduralRig:human,handSockets:human,upperBodyActions:human,footIK:true,ragdoll:false,rootMotion:false,combat:false,navigation:false}};
}

/** Additional scalar-field support for the defined humanoid surface. This is not
 * an editable gene or an extra bone. Anchors, the game, and review use it alike. */
export function humanoidSurfaceNodes(rig,nodes){
  if(rig?.family!=='humanoid'||rig.bodyStyle!=='defined')return nodes;
  const l=humanoidLayout(rig),s=rig.proportions.scale;
  return [...nodes.map(n=>({...n,surfaceBlend:.08})),{id:'__neck_surface',parent:'chest',center:[0,l.neckY+.06*s,0],radii:[.175*s,.24*rig.proportions.torso*s,.175*s],surfaceBlend:.08}];
}
