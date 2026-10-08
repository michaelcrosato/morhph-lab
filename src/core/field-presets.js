import {basePreset,createPart,validateGenome} from './genome.js';
import {defaultRig,syncHumanoidBody} from './humanoid.js';
import {defaultActor} from './actors.js';
import {defaultMotion} from './motion.js';
import {FIELD_MODELS} from './field-catalog.js';
import {SURFACE_PRESETS} from './surfaces.js';
import {HUMANOID_ACTIONS} from './humanoid-motion.js';
/** These recipes deliberately reuse existing parts. They fill role and silhouette gaps. */
export function fieldPreset(id,seed=9109){
 const def=FIELD_MODELS.find(x=>x.id===id);if(!def)throw new Error('Unknown field model.');
 const g=basePreset('sprout',seed);g.name=def.label;g.parts=[];
 const node=(id,radii,parent=null,offset=[0,0,0])=>({id,radii,parent,offset});
 const add=(type,host,anchor,size=1,length=1,variant=0,mirror=false,more={})=>{const p=createPart(g,type,host,anchor,mirror);Object.assign(p,{size,length,variant,...more});g.parts.push(p);return p;};
 const skin=(color,accent,id)=>{Object.assign(g.appearance,SURFACE_PRESETS[id],{color,accent,patternScale:3,strength:.45,warp:.1});delete g.appearance.label;};
 const action=(name)=>{g.motion.humanoid.action=name;g.motion.humanoid.repeat=HUMANOID_ACTIONS[name].loop;};
 const face=(muzzle=0,size=.58,ears=.47)=>{add('optic','head',[.8,.24,.6],.53,1,0,true);add('muzzle','head',[0,-.1,1],size,1,muzzle);add('ear','head',[.48,.85,0],ears,1,0,true);};
 const legs=(size=.8,length=1,variant=0)=>{for(const [z,phase] of [[.60,0],[-.60,.5]])add('beastleg','core',[.42,-1,z*.40],size,length,variant,true,{socketOffset:[0,0,z*.65],phase});};
 const human=(role,proportions={})=>{g.rig=defaultRig('humanoid');g.rig.bodyStyle='defined';g.rig.headStyle='bare';g.rig.outfit='tunic';Object.assign(g.rig.proportions,proportions);syncHumanoidBody(g);g.actor=defaultActor(role);g.motion=defaultMotion('idle');};
 g.motion=defaultMotion('animalamble');g.actor=defaultActor('civilian');g.actor.faction='neutral';
 switch(id){
 case 'trailhound':
  g.nodes=[node('core',[.38,.45,.84]),node('neck',[.29,.38,.34],'core',[0,.16,.65]),node('head',[.31,.32,.37],'neck',[0,.27,.23])];skin('#735645','#d6bc91','shortcoat');legs(.76,1.0,0);face(0,.70,.43);add('brushtail','core',[0,.25,-1],.55,1.1,0);g.actor.faction='friendly';break;
 case 'hillgrazer':
  g.nodes=[node('core',[.49,.58,.92]),node('neck',[.27,.57,.34],'core',[0,.37,.58]),node('head',[.29,.37,.36],'neck',[0,.48,.20])];skin('#b1a187','#51463b','woolcoat');legs(.85,1.28,1);face(1,.57,.42);add('antler','head',[.46,1,-.2],.44,.75,0,true);add('brushtail','core',[0,-.1,-1],.38,.65,1);break;
 case 'bristletusk':
  g.nodes=[node('core',[.57,.59,.88]),node('shoulder',[.52,.61,.56],'core',[0,.11,.42]),node('head',[.42,.36,.42],'shoulder',[0,-.22,.48])];skin('#594e45','#b39770','shortcoat');legs(.68,.74,1);face(2,.83,.40);add('brushtail','core',[0,.05,-1],.36,.65,2);g.motion=defaultMotion('animalsniff');g.actor=defaultActor('monster');g.actor.faction='neutral';break;
 case 'reedhopper':
  g.nodes=[node('core',[.63,.34,.60]),node('head',[.50,.31,.39],'core',[0,.02,.4])];skin('#5a7154','#d1bd82','shortcoat');g.appearance.pattern='spots';g.appearance.patternScale=4.8;
  add('beastleg','core',[.7,-1,.3],.53,.7,2,true,{socketOffset:[0,0,.18]});add('beastleg','core',[1,-.8,-.4],.82,.75,2,true,{socketOffset:[0,0,-.24],phase:.5});add('optic','head',[.6,.8,.25],.84,1,1,true);add('muzzle','head',[0,-.1,1],.65,.7,1);g.motion=defaultMotion('animalbound');break;
 case 'fieldmedic':
  human('civilian',{scale:1,bulk:.85,shoulders:.88});skin('#627e78','#e2d7b6','repaircloth');g.rig.headStyle='hood';action('offer');add('utilitybelt','core',[0,0,1],.9,1,1,false,{socket:'pelvis'});add('mantle','chest',[0,0,-1],.72,1,0);add('pack','chest',[0,0,-1],.53,1,0,false,{socketOffset:[0,-.35,.03]});break;
 case 'lamplighter':
  human('civilian',{scale:1.08,bulk:.8,legs:1.1});skin('#526476','#d1b887','repaircloth');g.rig.headStyle='hood';action('lamplook');add('fieldlamp','chest',[-.1,0,-1],.73,1,0,false,{socket:'hand',socketOffset:[0,-.08,.11]});add('utilitybelt','core',[0,0,1],.8,1,0);add('mantle','chest',[0,0,-1],.75,1,1);break;
 case 'archivist':
  human('civilian',{scale:1.02,bulk:.86,arms:.92});skin('#817087','#d2c4a3','checkcloth');action('readbook');add('folio','chest',[.1,0,1],.68,1,0,false,{socket:'hand',socketOffset:[0,-.10,-.06]});add('utilitybelt','core',[0,0,1],.8,1,0);add('mantle','chest',[0,0,-1],.8,1,2);break;
 case 'prospector':
  human('civilian',{scale:.93,bulk:1.18,shoulders:1.18,legs:.93});skin('#8f7355','#cebda1','repaircloth');g.rig.outfit='armor';action('work');add('worktool','chest',[-.08,1,0],.72,1,1,false,{socket:'hand'});add('pack','chest',[0,0,-1],.8,1,2);add('utilitybelt','core',[0,0,1],.84,1,0);break;
 case 'waypostarcher':
  human('guard',{scale:1.10,bulk:.77,arms:1.02,legs:1.08});skin('#5b6658','#bcb18a','fieldcloth');g.rig.headStyle='hood';action('bowdraw');add('bowrig','chest',[.1,0,1],.83,1,1,false,{socket:'hand',socketOffset:[0,-.12,-.06]});add('bowrig','chest',[.01,1,0],.6,1,2,false,{socket:'chest',socketOffset:[.12,-.25,-.45]});add('utilitybelt','core',[0,0,1],.75,1,0);break;
 case 'caravancourier':
  human('civilian',{scale:.97,bulk:.88,legs:1.03});skin('#927451','#d5bea0','checkcloth');action('writenote');add('folio','chest',[.1,0,1],.55,1,1,false,{socket:'hand',socketOffset:[0,-.10,-.06]});add('pack','chest',[0,0,-1],.76,1,2);add('utilitybelt','core',[0,0,1],.8,1,2);break;
 }
 g.appearance.textureSeed=seed>>>0;syncHumanoidBody(g);return validateGenome(g);
}
