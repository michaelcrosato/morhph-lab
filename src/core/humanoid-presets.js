import {HUMANOID_CONTENT} from './content-pack.js';
import {expansionPreset} from './expansion-presets.js';
import {basePreset,createPart,validateGenome} from './genome.js';
import {defaultRig,HUMANOID_MODELS,syncHumanoidBody} from './humanoid.js';
import {defaultActor} from './actors.js';
import {defaultMotion} from './motion.js';
export function humanoidPreset(which='wayfarer',seed=1042){
  if(HUMANOID_CONTENT.some(p=>p.id===which))return expansionPreset(which,seed);
  const model=HUMANOID_MODELS.find(p=>p.id===which);if(!model)throw new Error('Unknown humanoid model.');
  const g=basePreset('sprout',seed);g.name=model.label;g.parts=[];g.rig=defaultRig('humanoid');g.actor=defaultActor('civilian');
  g.motion=defaultMotion('idle');Object.assign(g.appearance,{color:'#c58d68',accent:'#386c70',pattern:'plain',roughness:.72,relief:.012,strength:.2});
  const proportions=v=>Object.assign(g.rig.proportions,v);
  const add=(type,host,anchor,size,length=1,mirror=true)=>{syncHumanoidBody(g);const p=createPart(g,type,host,anchor,mirror);Object.assign(p,{size,length});g.parts.push(p);return p;};
  const role=(id,style='neutral')=>{g.actor=defaultActor(id);g.motion.humanoid.style=style;};
  if(which==='warden'){proportions({shoulders:1.2,bulk:1.18,head:.96});g.rig.outfit='armor';g.rig.headStyle='crest';g.appearance.accent='#5b707a';role('guard');g.motion.humanoid.action='guard';}
  if(which==='ranger'){proportions({scale:.98,legs:1.15,shoulders:.86,bulk:.8});g.rig.headStyle='hood';g.appearance.accent='#647c45';role('scout');g.motion=Object.assign(defaultMotion('walk'),{humanoid:{...g.motion.humanoid}});}
  if(which==='goblin'){proportions({scale:.75,head:1.25,arms:1.15,legs:.85,shoulders:.87,bulk:.87,posture:.12});g.rig.outfit='wrap';g.rig.headStyle='bare';g.rig.handStyle='claws';Object.assign(g.appearance,{color:'#7b9b5e',accent:'#564952',pattern:'speckle',strength:.15});role('skirmisher','skulking');add('horn','head',[.95,.15,0],.4,.55);}
  if(which==='ogre'){proportions({scale:1.35,shoulders:1.4,hips:1.25,arms:1.18,legs:.87,bulk:1.55,head:.87,hands:1.4,feet:1.25,posture:.1});g.rig.outfit='wrap';g.rig.headStyle='bare';Object.assign(g.appearance,{color:'#a08d70',accent:'#665254',pattern:'cracks',strength:.18});role('brute','heavy');const p=add('horn','head',[.48,-.3,1],.35,.45);p.bend=-.5;}
  if(which==='revenant'){proportions({head:.92,arms:1.3,bulk:.67,hips:.8,shoulders:.83,posture:.32});g.rig.outfit='wrap';g.rig.headStyle='bare';g.rig.handStyle='claws';Object.assign(g.appearance,{color:'#89958b',accent:'#4f5c60',pattern:'marble',strength:.2});role('stalker','skulking');g.motion=Object.assign(defaultMotion('creep'),{humanoid:{...g.motion.humanoid}});}
  if(which==='golem'){proportions({scale:1.2,shoulders:1.4,hips:1.18,arms:1.13,bulk:1.5,head:.85,hands:1.4,feet:1.35});g.rig.outfit='carapace';g.rig.headStyle='bare';g.rig.handStyle='stone';Object.assign(g.appearance,{color:'#778689',accent:'#a5d9bd',pattern:'cracks',micro:'pebbles',strength:.8,roughness:.92,relief:.045,emission:.13});role('sentinel','stiff');}
  if(which==='fiend'){proportions({scale:1.1,shoulders:1.3,arms:1.2,bulk:1.12,legs:1.08,head:.92,posture:.12});g.rig.outfit='carapace';g.rig.headStyle='bare';g.rig.handStyle='claws';Object.assign(g.appearance,{color:'#995b56',accent:'#d2ae79',pattern:'scales',micro:'scales',strength:.3});role('monster');add('horn','head',[.65,.8,-.18],.65,1.05);add('tail','core',[0,-.12,-1],.85,1.2,false);add('crest','chest',[0,.4,-1],.55,.65,false);}
  if(which==='arcanist'){proportions({shoulders:.88,bulk:.83,arms:1.07,head:.96});g.rig.headStyle='hood';Object.assign(g.appearance,{color:'#ab9aa8',accent:'#655c9a',pattern:'rings',strength:.12,emission:.18});role('caster');g.motion.humanoid.action='cast';g.motion.humanoid.repeat=false;}
  syncHumanoidBody(g);return validateGenome(g);
}
