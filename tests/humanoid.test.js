import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,validateGenome,parseGenome,serializeGenome,mutate,createPart,removeGene} from '../src/core/genome.js';
import {HUMANOID_MODELS,PROPORTIONS,defaultRig,validateRig,humanoidLayout,humanoidNodes,syncHumanoidBody,compatibilityReport,socketRest} from '../src/core/humanoid.js';
import {humanoidSkeleton,humanoidSkinWeights,humanoidGarment} from '../src/core/rig-data.js';
import {HUMANOID_ACTIONS,defaultHumanoidMotion,validateHumanoidMotion,sampleHumanoidAction,collectActionEvents,blendHumanoidMotion} from '../src/core/humanoid-motion.js';
import {ACTOR_ROLES,defaultActor,validateActor,generateActorBatch,actorManifest,parseActorManifest,parseActorRoster,parseActorInput} from '../src/core/actors.js';
import {analyze,resolveNodes,expandParts} from '../src/core/anatomy.js';
import {compileBodySurface} from '../src/core/mesher.js';
import {defaultMixSettings,mixGenomes,createMixRecipe,parseMixRecipe} from '../src/core/mixer.js';
import {GenomeStore} from '../src/core/store.js';
import {sampleMotion} from '../src/core/motion.js';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const human=preset('wayfarer');

for(const {id} of HUMANOID_MODELS)test(`${id}: schema, skeleton, garments, controller envelope`,()=>{
  const g=preset(id);assert.equal(g.version,6);assert.equal(g.rig.family,'humanoid');assert.equal(g.nodes.length,4);
  assert.deepEqual(parseGenome(serializeGenome(g)),g);const before=JSON.stringify(g),spec=humanoidSkeleton(g.rig),names=new Set();
  assert.equal(spec.length,22);for(const b of spec){assert.ok(!names.has(b.name));assert.ok(b.parent===null||names.has(b.parent));names.add(b.name);assert.ok(b.position.every(Number.isFinite));}
  const a=analyze(g);assert.equal(a.legs,2);assert.ok(a.restHeight>0&&a.speed>0);assert.ok(!a.warnings.some(w=>w.includes('No legs')));
  const l=humanoidLayout(g.rig);near(l.restHeight,l.thigh+l.shin+l.footHeight-.035*l.scale);
  const garment=humanoidGarment(g.rig);assert.ok(garment.positions.every(Number.isFinite));assert.ok(garment.indices.every(i=>i<garment.positions.length/3));
  const skin=humanoidSkinWeights(garment.positions,g.rig);for(let i=0;i<skin.weights.length;i+=4){near([...skin.weights.slice(i,i+4)].reduce((a,b)=>a+b,0),1);assert.ok([...skin.indices.slice(i,i+4)].every(n=>n<22));}
  assert.equal(JSON.stringify(g),before);
});
for(const {id} of HUMANOID_MODELS)test(`${id}: implicit torso produces finite mesh and normalized skin weights`,()=>{
  const g=preset(id),data=compileBodySurface(resolveNodes(g)),w=humanoidSkinWeights(data.positions,g.rig);
  assert.ok(data.positions.every(Number.isFinite));assert.ok(data.normals.every(Number.isFinite));assert.ok(data.indices.length>500);
  for(let i=0;i<w.weights.length;i+=4)near(w.weights[i]+w.weights[i+1]+w.weights[i+2]+w.weights[i+3],1);
});
test('minimum and maximum proportions keep a valid connected humanoid',()=>{
  for(const edge of ['min','max']){const g=structuredClone(human);for(const [k,v] of Object.entries(PROPORTIONS))g.rig.proportions[k]=v[edge];syncHumanoidBody(g);validateGenome(g);const spec=humanoidSkeleton(g.rig);assert.ok(spec.every(b=>b.position.every(Number.isFinite)));}
});
test('proportion axis sweep validates every boundary independently',()=>{
  for(const [key,d] of Object.entries(PROPORTIONS))for(const value of [d.min,(d.min+d.max)/2,d.max]){const g=structuredClone(human);g.rig.proportions[key]=value;syncHumanoidBody(g);validateGenome(g);}
});
test('unknown rig and invalid scalar proportions fail closed',()=>{
  for(const raw of [null,[],{family:'dragon'}, {family:'humanoid',proportions:[]},{family:'humanoid',proportions:{scale:NaN}},{family:'humanoid',proportions:{arms:100}}])assert.throws(()=>validateRig(raw));
});
test('humanoid imports reject a stale or altered body graph',()=>{
  for(const mutate of [g=>g.nodes[0].radii[0]+=.1,g=>g.nodes.pop(),g=>g.nodes[2].id='renamed']){const g=structuredClone(human);mutate(g);assert.throws(()=>validateGenome(g));}
});
test('canonical humanoid nodes cannot be deleted',()=>{assert.throws(()=>removeGene(structuredClone(human),'head'),/rig-owned/);});
test('seeded mutation retains the humanoid contract',()=>{for(let i=0;i<100;i++){const g=mutate(human,i);assert.equal(g.rig.family,'humanoid');assert.deepEqual(g.nodes,humanoidNodes(g.rig));}});
test('monster attachments and bilateral hand sockets survive a round trip',()=>{
  const g=structuredClone(human),p=createPart(g,'horn','chest',[1,.3,.2],true);p.socket='hand';p.socketOffset=[.08,.1,.02];g.parts.push(p);const valid=validateGenome(g),parts=expandParts(valid);assert.equal(parts.length,2);near(parts[0].position[0],-parts[1].position[0]);assert.equal(parts[0].socket,'hand');assert.deepEqual(parseGenome(serializeGenome(valid)),valid);
});
test('socket offsets are bounded and names are allowlisted',()=>{
  const g=structuredClone(human);g.parts.push(createPart(g,'horn'));g.parts[0].socket='unknown';assert.throws(()=>validateGenome(g),/socket/);g.parts[0].socket='hand';g.parts[0].socketOffset=[2,0,0];assert.throws(()=>validateGenome(g),/socket/);
});
test('creature-leg genes are preserved and reported inactive on humanoids',()=>{
  const g=structuredClone(human);g.parts.push(createPart(g,'leg'));const h=validateGenome(g),report=compatibilityReport(h);assert.equal(h.parts.length,1);assert.equal(report.inactiveGenes.length,1);assert.equal(analyze(h).legs,2);
});
test('unsupported locomotion has an explicit compatibility message',()=>{const g=structuredClone(human);g.motion.weights.hover=1;assert.ok(compatibilityReport(g).notes.some(n=>n.includes('hover')));});
test('same-family body blending interpolates rig proportions',()=>{
  const a=preset('wayfarer'),b=preset('ogre'),settings=defaultMixSettings();settings.channels.body=.25;const {genome:g}=mixGenomes(a,b,settings);near(g.rig.proportions.scale,a.rig.proportions.scale*.75+b.rig.proportions.scale*.25);assert.deepEqual(g.nodes,humanoidNodes(g.rig));
});
test('body lock freezes the rig and role profile',()=>{
  const a=preset('wayfarer'),b=preset('ogre'),f=preset('ranger'),s=defaultMixSettings();s.locks.body=true;const {genome:g}=mixGenomes(a,b,s,f);assert.deepEqual(g.rig,f.rig);assert.deepEqual(g.actor,f.actor);assert.deepEqual(g.nodes,f.nodes);
});
test('cross-rig mixing keeps the chosen rig and a valid attachment graph',()=>{
  for(const a of ['wayfarer','fiend','warden'])for(const b of ['mossback','tendril','glider','sprout'])for(const t of [0,.25,.499,.5,.75,1]){
    const s=defaultMixSettings();for(const k of Object.keys(s.channels))s.channels[k]=t;
    const {genome:g,notes}=mixGenomes(preset(a),preset(b),s);assert.equal(g.rig.family,t<.5?'humanoid':'creature');validateGenome(g);assert.ok(notes.some(n=>n.includes('Rig family')));
    assert.ok(g.parts.every(p=>g.nodes.some(n=>n.id===p.host)));
  }
});
test('forced topology selects the expected family',()=>{for(const topology of ['a','b']){const s=defaultMixSettings();s.topology=topology;s.channels.body=topology==='a'?1:0;const g=mixGenomes(preset('wayfarer'),preset('mossback'),s).genome;assert.equal(g.rig.family,topology==='a'?'humanoid':'creature');}});
test('every humanoid pair blends at five weights without changing either source',()=>{
  for(const {id:a} of HUMANOID_MODELS)for(const {id:b} of HUMANOID_MODELS){const ga=preset(a),gb=preset(b),before=JSON.stringify([ga,gb]);for(const t of [0,.1,.5,.9,1]){const s=defaultMixSettings();for(const key of Object.keys(s.channels))s.channels[key]=t;validateGenome(mixGenomes(ga,gb,s).genome);}assert.equal(JSON.stringify([ga,gb]),before);}
});
test('mixer recipes round-trip humanoid sources and frozen values',()=>{
  const r=createMixRecipe(preset('fiend'),preset('warden'),defaultMixSettings(),preset('golem'));assert.deepEqual(parseMixRecipe(JSON.stringify(r)),r);
});
for(const action of Object.keys(HUMANOID_ACTIONS))test(`${action}: deterministic bounded pose samples and masks`,()=>{
  for(const mask of ['auto','upper','full'])for(const repeat of [true,false]){const m={...defaultHumanoidMotion(),action,mask,repeat};for(const time of [0,.03,.2,.6,1.1,3,100]){const p=sampleHumanoidAction(m,time);assert.ok(Number.isFinite(p.phase)&&p.phase>=0&&p.phase<=1);assert.ok(p.weight>=0&&p.weight<=1);assert.ok(Object.values(p.rotations).flat().every(Number.isFinite));assert.deepEqual(p,sampleHumanoidAction(m,time));if(mask==='upper'){assert.deepEqual(p.pelvisOffset,[0,0,0]);assert.ok(!Object.keys(p.rotations).some(n=>/^(pelvis|upperLeg|shin|foot)/.test(n)));}}}
});
test('one-shot attack returns to the locomotion layer',()=>{const m={...defaultHumanoidMotion(),action:'attack',repeat:false};assert.equal(sampleHumanoidAction(m,10).weight,0);});
test('sit and defeat hold their final pose without root motion',()=>{for(const action of ['sit','defeat']){const m={...defaultHumanoidMotion(),action,repeat:false};const p=sampleHumanoidAction(m,10);assert.equal(p.weight,1);assert.equal(p.mask,'full');assert.ok(p.pelvisOffset[1]<0);}});
test('zero action weight disables timing markers',()=>{const m={...defaultHumanoidMotion(),action:'attack',actionWeight:0};assert.deepEqual(collectActionEvents(m,0,10),[]);});
test('attack timing markers fire exactly once across frame boundaries',()=>{
  const m={...defaultHumanoidMotion(),action:'attack',repeat:false};let events=[];for(let i=0;i<120;i++)events.push(...collectActionEvents(m,i/60,(i+1)/60));assert.equal(events.length,1);assert.equal(events[0].name,'attack-contact');
});
test('action markers agree at 30 and 60 Hz',()=>{
  const m={...defaultHumanoidMotion(),action:'cast',repeat:true};const sample=hz=>{const events=[];for(let i=0;i<hz*6;i++)events.push(...collectActionEvents(m,i/hz,(i+1)/hz));return events;};assert.deepEqual(sample(30),sample(60));
});
test('seek, backwards time, and paused frames do not emit markers',()=>{const m={...defaultHumanoidMotion(),action:'cast'};assert.deepEqual(collectActionEvents(m,0,20,{seek:true}),[]);assert.deepEqual(collectActionEvents(m,1,1),[]);assert.deepEqual(collectActionEvents(m,2,1),[]);});
test('long frames bound timing marker work',()=>{const m={...defaultHumanoidMotion(),action:'attack'};assert.ok(collectActionEvents(m,0,100000).length<=33);});
test('humanoid motion validates masks, scalars, and action names',()=>{
  for(const patch of [{action:'bad'},{mask:'unknown'},{armSwing:Infinity},{actionSpeed:0},{repeat:'true'}])assert.throws(()=>validateHumanoidMotion({...defaultHumanoidMotion(),...patch}));
});
test('humanoid motion blend retains discrete action policy and blends scalars',()=>{const a={...defaultHumanoidMotion(),action:'wave',armSwing:0},b={...defaultHumanoidMotion(),action:'attack',armSwing:2};const c=blendHumanoidMotion(a,b,.75);near(c.armSwing,1.5);assert.equal(c.action,'attack');});
for(const role of Object.keys(ACTOR_ROLES))test(`${role}: actor role data validates`,()=>{assert.deepEqual(validateActor(defaultActor(role)),defaultActor(role));});
test('invalid role metadata is rejected',()=>{for(const p of [{role:'admin'},{role:'guard',faction:'evil'},{role:'guard',health:-1},{role:'guard',speed:NaN}])assert.throws(()=>validateActor(p));});
test('actor manifest and input import preserve the blueprint',()=>{const m=actorManifest(human);assert.deepEqual(parseActorManifest(JSON.stringify(m)),m);assert.deepEqual(parseActorInput(JSON.stringify(m)),human);assert.equal(m.contract.roleIsMetadata,true);assert.equal(m.contract.compatibility.capabilities.combat,false);});
test('batch generation is seeded, independent, bounded, and non-mutating',()=>{
  const before=JSON.stringify(human),settings={seed:444,count:24,variation:.5};const a=generateActorBatch(human,settings),b=generateActorBatch(human,settings);assert.deepEqual(a,b);assert.equal(new Set(a.actors.map(x=>x.id)).size,24);assert.notEqual(a.actors[0].blueprint.rig.proportions.scale,a.actors[1].blueprint.rig.proportions.scale);assert.equal(JSON.stringify(human),before);assert.deepEqual(parseActorRoster(JSON.stringify(a)),a);
});
test('different seeds produce different rosters',()=>{assert.notDeepEqual(generateActorBatch(human,{seed:1}),generateActorBatch(human,{seed:2}));});
test('all humanoid templates generate valid rosters at full variation',()=>{for(const {id} of HUMANOID_MODELS){const roster=generateActorBatch(preset(id),{count:24,seed:8873,variation:1});assert.equal(roster.actors.length,24);for(const a of roster.actors)validateGenome(a.blueprint);}});
test('zero variation preserves proportions, appearance controls, and attachments',()=>{const g=preset('fiend'),roster=generateActorBatch(g,{count:3,variation:0});for(const a of roster.actors){assert.deepEqual(a.blueprint.rig,g.rig);assert.deepEqual(a.blueprint.parts,g.parts);assert.equal(a.blueprint.appearance.patternScale,g.appearance.patternScale);}});
test('batch and roster imports reject invalid counts and duplicate IDs',()=>{for(const opts of [{count:0},{count:25},{count:1.2},{seed:-1},{variation:2}])assert.throws(()=>generateActorBatch(human,opts));const r=generateActorBatch(human);r.actors[1].id=r.actors[0].id;assert.throws(()=>parseActorRoster(JSON.stringify(r)),/duplicate/);});
test('proportion edit forms one validated undo step',()=>{
  const store=new GenomeStore(human);store.preview(g=>{g.rig.proportions.scale=1.1;syncHumanoidBody(g);});store.preview(g=>{g.rig.proportions.scale=1.2;syncHumanoidBody(g);});store.commitPreview();assert.equal(store.past.length,1);store.undo();assert.deepEqual(store.state,human);store.redo();near(store.state.rig.proportions.scale,1.2);
});


test('full-body leg actions specify both thighs, shins, and feet',()=>{
  for(const action of ['jump','sit','defeat']){
    const pose=sampleHumanoidAction({...defaultHumanoidMotion(),action,repeat:false},1);
    for(const side of ['L','R'])for(const joint of ['upperLeg','shin','foot'])assert.ok(pose.rotations[joint+'.'+side]);
  }
});
test('seated height adapts to all supported leg lengths and foot sizes',async()=>{
  const {humanoidActionOffset}=await import('../src/core/humanoid-motion.js');
  const config={...defaultHumanoidMotion(),action:'sit',repeat:false},pose=sampleHumanoidAction(config,10);
  for(const {id} of HUMANOID_MODELS)for(const leg of [.75,1,1.35])for(const foot of [.7,1,1.45]){
    const g=preset(id);g.rig.proportions.legs=leg;g.rig.proportions.feet=foot;const l=humanoidLayout(g.rig);
    const offset=humanoidActionOffset(config,pose,l);
    const verticalReach=(l.thigh*Math.cos(1.48)+l.shin)*Math.cos(.07)+l.footHeight+.025*l.scale;
    near(l.restHeight+offset[1]-verticalReach,0,1e-8);assert.ok(offset.every(Number.isFinite));
  }
  assert.deepEqual(humanoidActionOffset(config,{...pose,mask:'upper'},humanoidLayout(human.rig)),[0,0,0]);
});
test('actor imports reject oversize text before JSON parsing',()=>{assert.throws(()=>parseActorInput(' '.repeat(1048577)),/exceeds/);});
test('mixer source import accepts actor manifests without losing role or rig',async()=>{
  const {MixerController}=await import('../src/editor/mixer-controller.js');const mixer=new MixerController(new GenomeStore(human));
  const source=preset('warden');mixer.importSource('b',JSON.stringify(actorManifest(source)));assert.deepEqual(mixer.sources.b,source);
});
