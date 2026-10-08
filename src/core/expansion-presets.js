import {HUMANOID_ACTIONS} from './humanoid-motion.js';
import {basePreset,createPart,validateGenome} from './genome.js';
import {defaultRig,syncHumanoidBody} from './humanoid.js';
import {defaultActor} from './actors.js';
import {defaultMotion} from './motion.js';
import {SURFACE_PRESETS} from './surfaces.js';
import {HUMANOID_CONTENT,CREATURE_CONTENT} from './content-pack.js';
import {applyPartKit} from './kits.js';
/** These presets compile through the same schema, part registry, and rig as user content. */
export function expansionPreset(which,seed=1042){
  const model=[...HUMANOID_CONTENT,...CREATURE_CONTENT].find(x=>x.id===which);if(!model)throw new Error('Unknown content model.');
  const human=HUMANOID_CONTENT.some(x=>x.id===which);
  let g=basePreset(['myconid','billrunner','rootweaver'].includes(which)?'sprout':['shardback','ironmaw'].includes(which)?'skitter':'mossback',seed);g.name=model.label;
  const add=(type,host,anchor,size=1,length=1,variant=0,mirror=false,socket='body')=>{const p=createPart(g,type,host,anchor,mirror);Object.assign(p,{size,length,variant,socket});g.parts.push(p);return p;};
  const remove=(...types)=>{g.parts=g.parts.filter(p=>!types.includes(p.type));};
  const kit=id=>{g=applyPartKit(g,id).genome;};
  const skin=(color,accent,recipe,pattern)=>{Object.assign(g.appearance,SURFACE_PRESETS[recipe],{color,accent,pattern:pattern||SURFACE_PRESETS[recipe].pattern});delete g.appearance.label;};
  const prop=values=>{Object.assign(g.rig.proportions,values);syncHumanoidBody(g);};
  const motion=(clip,action='none',style='neutral')=>{g.motion=defaultMotion(clip);Object.assign(g.motion.humanoid,{action,style,repeat:HUMANOID_ACTIONS[action].loop});};
  if(human){g.rig=defaultRig('humanoid');syncHumanoidBody(g);g.parts=[];g.actor=defaultActor('civilian');skin('#bd9278','#596f72','velvet','plain');g.appearance.strength=.16;}
  switch(which){
    case 'duelist':prop({bulk:.86,hips:.88,legs:1.08});g.rig.outfit='armor';g.rig.headStyle='crest';g.actor=defaultActor('skirmisher');skin('#b9947e','#947254','leather','plain');motion('strafe','guard','nimble');kit('guard');break;
    case 'outrider':prop({scale:1.04,legs:1.15,bulk:.86,shoulders:.96});g.rig.headStyle='hood';g.actor=defaultActor('scout');skin('#b58a71','#4e715e','linen','plain');motion('trot','none','nimble');kit('traveler');break;
    case 'artisan':prop({shoulders:1.2,bulk:1.17,arms:1.05});g.rig.headStyle='bare';skin('#b88971','#855f48','leather','plain');motion('idle','work','heavy');add('blade','chest',[-.06,-1,0],.56,.65,2,false,'hand');add('pack','chest',[0,0,-1],.65,.8,0);break;
    case 'pilgrim':prop({scale:.98,bulk:.83,shoulders:.87,posture:.06});g.rig.headStyle='hood';skin('#a88d7a','#b0a174','linen','plain');motion('walk','none','limping');kit('traveler');g.parts=g.parts.filter(p=>p.type!=='banner');break;
    case 'grovekeeper':prop({scale:1.15,arms:1.2,bulk:.8,head:.96});g.rig.headStyle='bare';g.rig.handStyle='claws';g.actor=defaultActor('caster');skin('#777b4e','#cab180','bark');g.appearance.strength=.5;motion('idle','pray','proud');kit('wild');g.parts=g.parts.filter(p=>p.type!=='muzzle');add('foliage','chest',[1,.6,-.2],.6,1,1,true);add('staff','chest',[-.06,1,0],.9,1,2,false,'hand');break;
    case 'oracle':prop({scale:1.06,shoulders:.82,bulk:.77,head:1.04});g.rig.headStyle='hood';g.actor=defaultActor('caster');skin('#b5abbf','#9d79bc','porcelain');motion('idle','inspect','proud');kit('caster');add('crystal','head',[0,1,-.1],.35,.65,1);g.appearance.emission=.27;break;
    case 'jackal':prop({scale:1.06,arms:1.17,legs:1.13,head:1.07,posture:.14,bulk:.88});g.rig.outfit='wrap';g.rig.headStyle='bare';g.rig.handStyle='claws';g.actor=defaultActor('stalker');skin('#aa8152','#4c4142','leather','rosettes');g.appearance.strength=.7;motion('prowl','roar','skulking');add('ear','head',[.85,.8,0],.55,1.2,0,true);add('muzzle','head',[0,-.1,1],.6,1,0);add('tail','core',[0,-.1,-1],.62,1.25,0);break;
    case 'clockwork':prop({scale:1.12,shoulders:1.23,hips:.88,bulk:1.24,head:.85});g.rig.outfit='carapace';g.rig.headStyle='crest';g.rig.handStyle='stone';g.actor=defaultActor('sentinel');skin('#535f65','#e1b576','circuit');g.appearance.strength=.7;motion('walk','guard','stiff');add('pauldron','chest',[1,.3,0],.66,1,2,true,'upperArm');add('pack','chest',[0,0,-1],.75,.7,1).material='metal';add('crystal','head',[0,1,0],.35,.8,2);break;
    case 'crownstag':g.nodes[0].radii=[.73,.83,1.38];g.nodes[1].offset=[0,.42,.95];remove('horn','mouth');for(const p of g.parts)if(p.type==='leg')p.length=1.6;skin('#978163','#e3cd9e','leather','rosettes');motion('trot');kit('wild');break;
    case 'myconid':remove('fin','tail','mouth');g.nodes[0].radii=[.73,1.13,.73];skin('#ae7f6a','#efc799','coral','spots');motion('idle');add('foliage','core',[0,1,0],1.5,1.1,2);add('foliage','core',[1,.15,.2],.58,.9,1,true);add('beak','core',[0,-.15,1],.35,.5,1);break;
    case 'shardback':remove('fin');g.nodes[0].radii=[.95,.57,1.33];skin('#687483','#a5d5de','porcelain','veins');motion('creep');add('shell','core',[0,1,0],1.23,1.2,2);add('crystal','core',[0,1,-.2],1.1,1.4,0);add('crystal','head',[0,1,-.2],.55,.7,1);break;
    case 'billrunner':remove('mouth','fin');g.nodes[0].radii=[.64,.92,.77];for(const p of g.parts)if(p.type==='leg')p.length=1.55;skin('#5f8a92','#e7bb6b','reptile','chevron');motion('run');add('beak','core',[0,.03,1],.75,1.25,2);add('wing','core',[1,.3,-.2],.63,.85,1,true);add('crest','core',[0,1,-.15],.65,1.0,1);break;
    case 'boglurker':remove('horn','mouth');g.nodes[0].radii=[1.0,.48,1.4];g.nodes[1].offset=[0,0,.90];g.nodes[1].radii=[.75,.45,.7];skin('#586b4c','#acb28c','bark','mottled');motion('prowl');add('muzzle','head',[0,-.05,1],1.0,1.1,1);add('foliage','core',[1,.7,-.25],.7,1.2,0,true);add('ear','head',[1,.15,-.1],.5,.7,2,true);break;
    case 'sunmanta':remove('leg','horn','mouth');g.nodes[0].radii=[1.08,.44,1.15];g.nodes[1].offset=[0,.05,.85];g.nodes[1].radii=[.64,.4,.6];skin('#b78354','#f2d995','velvet','rings');motion('swim');add('wing','core',[1,.2,-.1],1.35,1.45,2,true);add('beak','head',[0,0,1],.6,.7,1);add('frill','core',[1,.1,-.7],.65,.9,0,true);break;
    case 'rootweaver':remove('leg','fin','tail');g.nodes[0].radii=[.78,1.10,.7];skin('#7d7650','#bbd089','bark');motion('display');for(const z of [-.7,0,.7])add('tentacle','core',[1,-.6,z],.85,1.6,1,true);add('antler','core',[.6,1,-.15],.85,1.2,2,true);add('foliage','core',[1,.6,0],.7,1.15,1,true);break;
    case 'ironmaw':remove('fin','mouth');skin('#5f656d','#bf9b70','iron','circuit');motion('backpedal');add('shell','core',[0,1,-.1],1.24,1.4,1);add('muzzle','head',[0,-.1,1],.8,1.1,2);add('mandible','head',[.7,-.2,1],.75,1.1,1,true);add('crystal','core',[0,1,-.7],.7,1.0,2);break;
  }
  // An extra layer makes source blending visible without a texture image.
  if(['oracle','clockwork','shardback','sunmanta','rootweaver'].includes(which))g.appearance.layers=[{pattern:'speckle',scale:7,weight:.2,angle:.3,warp:.35}];
  syncHumanoidBody(g);return validateGenome(g);
}
