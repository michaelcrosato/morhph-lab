import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {CATALOG,PART_MATERIALS,PALETTES} from '../src/core/catalog.js';
import {HUMANOID_CONTENT,CREATURE_CONTENT,PART_KITS} from '../src/core/content-pack.js';
import {EXPANSION_PARTS} from '../src/core/expansion-catalog.js';
import {PRESET_MODELS,preset} from '../src/core/presets.js';
import {validateGenome,parseGenome,serializeGenome,createPart,mutate,LIMITS} from '../src/core/genome.js';
import {applyPartKit} from '../src/core/kits.js';
import {analyze,expandParts,resolveNodes} from '../src/core/anatomy.js';
import {compileBodySurface} from '../src/core/mesher.js';
import {MOTION_CLIPS,defaultMotion,sampleMotion} from '../src/core/motion.js';
import {HUMANOID_ACTIONS,defaultHumanoidMotion,sampleHumanoidAction,collectActionEvents,humanoidActionOffset} from '../src/core/humanoid-motion.js';
import {EXPANSION_ACTIONS} from '../src/core/expansion-motion.js';
import {humanoidLayout,HUMANOID_LOCOMOTION,compatibilityReport} from '../src/core/humanoid.js';
import {PATTERNS,MICRO_SURFACES,SURFACE_PRESETS,generateMicroTexture} from '../src/core/surfaces.js';
import {defaultMixSettings,mixGenomes,createMixRecipe,parseMixRecipe} from '../src/core/mixer.js';
import {GenomeStore} from '../src/core/store.js';
import {actorManifest,generateActorBatch,parseActorManifest} from '../src/core/actors.js';
const finite=a=>assert.ok(a.every(Number.isFinite));
const all=t=>{const s=defaultMixSettings();for(const k in s.channels)s.channels[k]=t;return s;};

test('v9 content inventory is explicit and has unique IDs',()=>{
  assert.equal(Object.keys(CATALOG).length,73);assert.equal(PRESET_MODELS.length,89);assert.equal(new Set(PRESET_MODELS.map(p=>p.id )).size,89);
  assert.equal(PATTERNS.length,46);assert.equal(MICRO_SURFACES.length,31);assert.equal(Object.keys(SURFACE_PRESETS).length,46);
  assert.equal(Object.keys(HUMANOID_ACTIONS).length,36);assert.equal(Object.keys(MOTION_CLIPS).length,37);assert.equal(PALETTES.length,36);
});
for(const [id,p] of Object.entries(EXPANSION_PARTS))test(id+' gene exposes three named shapes and round-trips each material',()=>{
  assert.equal(p.variants.length,3);assert.ok(p.description&&p.category&&p.label);
  for(let variant=0;variant<3;variant++)for(const material of PART_MATERIALS){const g=preset('wayfarer');g.parts=[{...createPart(g,id),variant,material}];const clean=parseGenome(serializeGenome(g));assert.equal(clean.parts[0].material,material);assert.equal(clean.parts[0].variant,variant);for(const p of expandParts(clean)){finite(p.position);finite(p.normal);}}
});
test('old v3 files upgrade with factory-default part materials',()=>{
  const g=JSON.parse(readFileSync(new URL('../examples/fiend.morph.json',import.meta.url),'utf8'));g.version=3;for(const p of g.parts)delete p.material;
  const clean=validateGenome(g);assert.equal(clean.version,6);assert.ok(clean.parts.every(p=>p.material==='inherit'));assert.equal(clean.parts.length,g.parts.length);
});
test('unknown materials and unknown future versions are rejected',()=>{for(const material of ['plastic',null,{},'__proto__']){const g=preset('mossback');g.parts[0].material=material;if(material===null)assert.equal(validateGenome(g).parts[0].material,'inherit');else assert.throws(()=>validateGenome(g));}const g=preset();g.version=7;assert.throws(()=>validateGenome(g));});
test('held equipment uses right-hand defaults only on the humanoid rig',()=>{for(const type of ['blade','staff']){const h=createPart(preset('wayfarer'),type);assert.equal(h.socket,'hand');assert.ok(h.anchor[0]<0);assert.equal(createPart(preset('sprout'),type).socket,'body');}});
for(const [id,k] of Object.entries(PART_KITS))test(id+' kit is a pure, validated, single-step edit',()=>{
  const source=preset('wayfarer'),snapshot=JSON.stringify(source),result=applyPartKit(source,id),store=new GenomeStore(source);
  assert.equal(result.added.length,k.parts.length);assert.equal(result.genome.parts.length,source.parts.length+k.parts.length);assert.equal(JSON.stringify(source),snapshot);
  store.replace(result.genome,'Kit');assert.equal(store.past.length,1);store.undo();assert.deepEqual(store.state,source);store.redo();assert.deepEqual(store.state,result.genome);
  for(const p of result.genome.parts)assert.ok(result.genome.nodes.some(n=>n.id===p.host));
  const creature=preset('sprout');if(k.family==='any')validateGenome(applyPartKit(creature,id).genome);else assert.throws(()=>applyPartKit(creature,id),/humanoid/);
});
test('a full kit fails atomically at the gene cap',()=>{const g=preset('wayfarer');for(let i=0;i<31;i++)g.parts.push(createPart(g,'horn'));const before=JSON.stringify(g);assert.throws(()=>applyPartKit(g,'guard'),/32/);assert.equal(JSON.stringify(g),before);});
test('repeated kits receive unique IDs and preserve manual material choices',()=>{let g=applyPartKit(preset('wayfarer'),'guard').genome;g.parts[0].material='bone';g=applyPartKit(g,'guard').genome;assert.equal(new Set(g.parts.map(p=>p.id)).size,6);assert.equal(g.parts[0].material,'bone');});
for(const {id} of [...HUMANOID_CONTENT,...CREATURE_CONTENT])test(id+' model, mesh, actor export, and seeded variations validate',()=>{
  const g=preset(id,1234),same=preset(id,1234);assert.deepEqual(g,same);assert.deepEqual(parseGenome(serializeGenome(g)),g);
  const a=analyze(g);finite([a.speed,a.restHeight,a.volume]);assert.ok(g.parts.length<=LIMITS.parts);
  const mesh=compileBodySurface(resolveNodes(g));finite(mesh.positions);finite(mesh.normals);assert.ok(mesh.indices.length>0);
  for(const seed of [0,15,4294967295])validateGenome(mutate(g,seed));
  assert.deepEqual(parseActorManifest(JSON.stringify(actorManifest(g))).blueprint,g);
});
test('89 x 89 models at three blend positions preserve immutable sources and valid contracts',()=>{
  const models=PRESET_MODELS.map(m=>preset(m.id)),snapshots=models.map(g=>JSON.stringify(g));let combinations=0;
  for(const a of models)for(const b of models)for(const t of [.25,.5,.75]){const {genome}=mixGenomes(a,b,all(t));validateGenome(genome);assert.ok(genome.parts.every(p=>PART_MATERIALS.includes(p.material)));combinations++;}
  assert.equal(combinations,23763);models.forEach((g,i)=>assert.equal(JSON.stringify(g),snapshots[i]));
});
test('material choice follows the paired part and a parts lock retains it',()=>{const a=applyPartKit(preset('wayfarer'),'guard').genome,b=structuredClone(a);a.parts[0].material='bone';b.parts[0].material='metal';assert.equal(mixGenomes(a,b,all(.25)).genome.parts[0].material,'bone');assert.equal(mixGenomes(a,b,all(.75)).genome.parts[0].material,'metal');const s=all(.9);s.locks.parts=true;assert.equal(mixGenomes(a,b,s,a).genome.parts[0].material,'bone');});
test('same-type attachments on different sockets do not get paired together',()=>{const a=preset('wayfarer'),b=preset('wayfarer');a.parts=[{...createPart(a,'crystal','chest'),socket:'hand'}];b.parts=[{...createPart(b,'crystal','chest'),socket:'head'}];const mixed=mixGenomes(a,b,all(.5)).genome;assert.equal(mixed.parts.length,2);assert.deepEqual(new Set(mixed.parts.map(p=>p.socket)),new Set(['hand','head']));});
test('v4 material and action settings survive mixer recipe export',()=>{const a=preset('duelist'),b=preset('jackal');a.parts[0].material='bone';a.motion.humanoid.action='thrust';const r=createMixRecipe(a,b,all(.45));assert.deepEqual(parseMixRecipe(JSON.stringify(r)),r);});
for(const [id,def] of Object.entries(EXPANSION_ACTIONS))test(id+' action samples are finite, repeatable, and mask-safe',()=>{
  const c={...defaultHumanoidMotion(),action:id,repeat:false};
  for(let i=0;i<=30;i++){const t=i/30*def.duration,pose=sampleHumanoidAction(c,t);for(const e of Object.values(pose.rotations))finite(e);finite(pose.pelvisOffset);assert.deepEqual(sampleHumanoidAction(c,t),pose);assert.ok(pose.weight>=0&&pose.weight<=1);}
  const upper=sampleHumanoidAction({...c,mask:'upper'},def.duration*.5);assert.ok(!Object.keys(upper.rotations).some(n=>/^(pelvis|upperLeg|shin|foot)/.test(n)));assert.deepEqual(upper.pelvisOffset,[0,0,0]);
  const events=[];for(let i=0;i<300;i++)events.push(...collectActionEvents(c,i/60,(i+1)/60));assert.equal(events.length,def.events.length);assert.equal(collectActionEvents(c,0,5,{seek:true}).length,0);
  const end=sampleHumanoidAction(c,def.duration*3);assert.equal(end.finished,true);assert.equal(end.weight,def.hold?1:0);
});
test('kneeling offset scales with the front leg dimensions',()=>{for(const id of ['goblin','ogre','duelist']){const g=preset(id),l=humanoidLayout(g.rig),c={...g.motion.humanoid,action:'kneel',repeat:false};const p=sampleHumanoidAction(c,4),offset=humanoidActionOffset(c,p,l);finite(offset);assert.ok(offset[1]<0&&offset[1]>-l.restHeight);}});
test('new motion clips produce finite offsets and explicit directions',()=>{for(const id of ['backpedal','strafe','prowl','trot']){const p=sampleMotion(defaultMotion(id));for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));assert.ok(HUMANOID_LOCOMOTION.includes(id));}assert.ok(sampleMotion(defaultMotion('backpedal')).stride<0);assert.ok(sampleMotion(defaultMotion('strafe')).lateral>0);});
test('new surfaces validate, are distinct, and preserve alpha',()=>{
  const hashes=[];for(const micro of MICRO_SURFACES){const a=generateMicroTexture(871,micro,32);assert.deepEqual(a,generateMicroTexture(871,micro,32));hashes.push(a.join(','));for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);}assert.equal(new Set(hashes).size,MICRO_SURFACES.length);
  for(const pattern of PATTERNS){const g=preset('wayfarer');g.appearance.pattern=pattern;validateGenome(g);}
  for(const recipe of Object.values(SURFACE_PRESETS)){const g=preset();Object.assign(g.appearance,recipe);validateGenome(g);}
});
test('all expansion actors produce a 24-member repeatable roster',()=>{for(const {id} of HUMANOID_CONTENT){const source=preset(id),opts={seed:722,count:24,variation:1},a=generateActorBatch(source,opts),b=generateActorBatch(source,opts);assert.deepEqual(a,b);assert.equal(a.actors.length,24);for(const actor of a.actors)validateGenome(actor.blueprint);}});
test('new full-body actions report the upright-controller boundary',()=>{for(const action of ['kneel','kick','dodge']){const g=preset('wayfarer');g.motion.humanoid.action=action;assert.ok(compatibilityReport(g).notes.some(x=>x.includes('upright')));}});

test('public part and kit APIs reject inherited property names',()=>{for(const name of ['constructor','__proto__','toString']){assert.throws(()=>createPart(preset('wayfarer'),name),/Unknown part/);assert.throws(()=>applyPartKit(preset('wayfarer'),name),/Unknown part kit/);}});
