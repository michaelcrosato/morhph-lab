import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {FIELD_MODELS,FIELD_PARTS,FIELD_KITS} from '../src/core/field-catalog.js';
import {FIELD_MOTION,FIELD_ACTIONS} from '../src/core/field-motion.js';
import {FIELD_PATTERNS,FIELD_MICRO,FIELD_SURFACES} from '../src/core/field-surfaces.js';
import {EXPANSION_PARTS} from '../src/core/expansion-catalog.js';
import {SHARED_PARTS} from '../src/core/shared-parts.js';
import {PRESET_MODELS} from '../src/core/presets.js';
import {preset,createPart,validateGenome,serializeGenome,parseGenome,mutate} from '../src/core/genome.js';
import {expandParts,analyze} from '../src/core/anatomy.js';
import {compileTidalPart,sampleTidalPart,placeTidalPoint,meshNormals} from '../src/core/tidal-geometry.js';
import {sampleMotion,defaultMotion} from '../src/core/motion.js';
import {FoundationCompiler,foundationBlueprint,FOUNDATIONS} from '../src/review/foundation.js';
import {auditSnapshot} from '../src/review/audit.js';
import {rasterize,fitFrame} from '../src/review/raster.js';
import {defaultHumanoidMotion,sampleHumanoidAction,collectActionEvents} from '../src/core/humanoid-motion.js';
import {handGrip,fingerCurl,bowPull,equipmentAction} from '../src/core/equipment-pose.js';
import {generateMicroTexture} from '../src/core/surfaces.js';
import {reviewPattern} from '../src/review/pigment.js';
import {applyPartKit} from '../src/core/kits.js';
import {GenomeStore} from '../src/core/store.js';
import {defaultMixSettings,mixGenomes,createMixRecipe,parseMixRecipe} from '../src/core/mixer.js';
import {actorManifest,generateActorBatch,parseActorRoster} from '../src/core/actors.js';
import {libraryCoverage} from '../src/core/library-coverage.js';
import {fieldSupportPoints} from '../src/core/field-geometry.js';
import {box,prism} from '../src/core/solid-mesh.js';
const finite=a=>assert.ok(Array.from(a).every(Number.isFinite));
const digest=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const near=(a,b,e=2e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function gene(type,variant=0,mirror=false){const g=preset('sprout');g.parts=[{...createPart(g,type,'core',[1,.22,.05],mirror),variant,size:.8,length:1.15}];return expandParts(validateGenome(g));}
const animation={...sampleMotion(defaultMotion('animalamble')),phaseLag:0,action:{name:'bowdraw',phase:.46,weight:1}};
const families={...EXPANSION_PARTS,...FIELD_PARTS};
test('review-led inventory and coverage are explicit; technical coverage is not approval',()=>{
 const c=libraryCoverage();assert.equal(c.counts.models,89);assert.equal(c.counts.civilianHumanoids,9);assert.equal(c.counts.partFamilies,73);assert.equal(c.counts.sharedPartFamilies,73);assert.equal(c.counts.completeReviewModels,89);assert.equal(c.unsupportedFamilies.length,0);assert.equal(c.gpuVerified,false);assert.equal(c.physicsVerified,false);assert.deepEqual(c.unusedFamilies,[]);
 assert.equal(FIELD_MODELS.length,10);assert.equal(FIELD_MODELS.filter(m=>m.family==='humanoid').length,6);assert.equal(new Set(PRESET_MODELS.map(m=>m.id)).size,89);assert.equal(FOUNDATIONS.length,24);
 assert.deepEqual(c,libraryCoverage());assert.ok(c.models.find(m=>m.id==='warden').unsupportedFamilies.length===0);
});
for(const type of Object.keys(families))for(const variant of [0,1,2])test(`${type}/${variant}: shared buffers are valid, repeatable, and do not mutate rest geometry`,()=>{
 const p=gene(type,variant)[0],plan=compileTidalPart(p),before=plan.components.map(c=>digest(c.positions)),out=sampleTidalPart(plan,.273,animation),saved=out.map(c=>c.positions.slice());
 assert.ok(plan.components.length>0);assert.ok(plan.components.length<=7);
 for(const c of out){finite(c.positions);finite(c.normals);finite(c.uvs);assert.equal(c.positions.length,c.normals.length);assert.equal(c.uvs.length,c.positions.length/3*2);assert.ok(c.indices.every(i=>Number.isInteger(i)&&i>=0&&i<c.positions.length/3));}
 const reused=sampleTidalPart(plan,1.31,animation,out);assert.equal(reused[0].positions,out[0].positions);sampleTidalPart(plan,.273,animation,reused);out.forEach((c,i)=>assert.deepEqual(c.positions,saved[i]));assert.deepEqual(plan.components.map(c=>digest(c.positions)),before);
});
for(const type of Object.keys(families))test(`${type}: three real shapes, bilateral placement, and static zero-flex`,()=>{
 assert.equal(new Set([0,1,2].map(v=>compileTidalPart(gene(type,v)[0]).components.map(c=>digest(c.positions)).join('-'))).size,3);
 const pair=gene(type,1,true),a=pair.map(p=>sampleTidalPart(compileTidalPart(p),.34,animation));assert.equal(pair.length,2);
 for(let c=0;c<a[0].length;c++)for(let i=0;i<a[0][c].positions.length-2;i+=183){const p=placeTidalPoint(a[0][c].positions.subarray(i,i+3),pair[0]),q=placeTidalPoint(a[1][c].positions.subarray(i,i+3),pair[1]);near(p[0],-q[0]);near(p[1],q[1]);near(p[2],q[2]);}
 const plan=compileTidalPart({...pair[0],flex:0}),x=sampleTidalPart(plan,0,animation),y=sampleTidalPart(plan,3.7,animation);x.forEach((m,i)=>assert.deepEqual(m.positions,y[i].positions));
});
for(const def of FIELD_MODELS)test(def.id+': visible parts, action changes, source round trip, mutation, and actor contracts',()=>{
 const g=preset(def.id),saved=serializeGenome(g),c=new FoundationCompiler(g),a=c.sample({pose:'motion-cycle',phase:.17}),b=c.sample({pose:'motion-cycle',phase:.49});assert.equal(a.excludedGenes,0);assert.equal(b.excludedGenes,0);assert.equal(g.rig.family,def.family);assert.equal(g.motion.travel.medium,'ground');
 assert.notEqual(auditSnapshot(a).technicalStatus,'fail');assert.equal(auditSnapshot(a).visualStatus,'not-reviewed');let diff=0;a.meshes.forEach((m,i)=>{finite(m.positions);finite(m.normals);for(let k=0;k<m.positions.length;k+=99)diff+=Math.abs(m.positions[k]-b.meshes[i].positions[k]);});assert.ok(diff>.01);
 const image=rasterize(a,{width:128,height:128,view:'quarter',frame:fitFrame([a,b]),shading:'pattern'});assert.equal(image.clipped,0);assert.ok(image.mask.reduce((s,x)=>s+x,0)>100);
 assert.equal(serializeGenome(g),saved);assert.deepEqual(parseGenome(saved),g);for(const seed of [0,90,4294967295])validateGenome(mutate(g,seed));assert.equal(actorManifest(g).contract.travel.medium,'ground');
 const roster=generateActorBatch(g,{seed:81,count:3,variation:.3});assert.deepEqual(roster,parseActorRoster(JSON.stringify(roster)));
});
for(const id of Object.keys(FIELD_KITS))test(id+': kit has one undo step and rejects invalid changes atomically',()=>{
 const g=preset('wayfarer'),before=serializeGenome(g),r=applyPartKit(g,id),store=new GenomeStore(g);store.replace(r.genome,'Field kit');assert.equal(store.past.length,1);store.undo();assert.deepEqual(store.state,g);store.redo();assert.deepEqual(store.state,r.genome);assert.equal(serializeGenome(g),before);
 if(FIELD_KITS[id].family==='humanoid')assert.throws(()=>applyPartKit(preset('sprout'),id),/humanoid/);
 const full=structuredClone(g);while(full.parts.length<32)full.parts.push(createPart(full,'ear'));const snapshot=JSON.stringify(full);assert.throws(()=>applyPartKit(full,id),/32/);assert.equal(JSON.stringify(full),snapshot);
});
for(const [id,def] of Object.entries(FIELD_ACTIONS))test(id+': finite poses, action masks, phase timing, zero weight, and seek-safe cues',()=>{
 const cfg={...defaultHumanoidMotion(),action:id,repeat:false};for(let i=0;i<=32;i++){const time=i/32*def.duration,p=sampleHumanoidAction(cfg,time);finite(p.pelvisOffset);Object.values(p.rotations).forEach(finite);assert.deepEqual(p,sampleHumanoidAction(cfg,time));}
 const upper=sampleHumanoidAction({...cfg,mask:'upper'},def.duration*.5);assert.ok(!Object.keys(upper.rotations).some(n=>/^(pelvis|upperLeg|shin|foot)/.test(n)));assert.deepEqual(upper.pelvisOffset,[0,0,0]);assert.equal(sampleHumanoidAction({...cfg,actionWeight:0},1).weight,0);
 const cues=[];for(let i=0;i<800;i++)cues.push(...collectActionEvents(cfg,i/120,(i+1)/120));assert.equal(cues.length,def.events.length);assert.equal(collectActionEvents(cfg,0,9,{seek:true}).length,0);
});
for(const id of Object.keys(FIELD_MOTION))test(id+': finite movement and explicit humanoid compatibility',()=>{const pose=sampleMotion(defaultMotion(id));Object.values(pose).filter(v=>typeof v==='number').forEach(v=>assert.ok(Number.isFinite(v)));const h=preset('wayfarer');h.motion=defaultMotion(id);assert.ok(analyze(h).warnings.some(s=>s.includes(id)));});
for(const id of FIELD_PATTERNS)test(id+': deterministic, bounded, spatially changing pigment',()=>{
 const values=Array.from({length:500},(_,i)=>{const p=[i*.057,Math.sin(i)*2,i*.131],v=reviewPattern(id,p,.3);assert.equal(v,reviewPattern(id,p,.3));assert.ok(v>=0&&v<=1);return v;});assert.ok(Math.max(...values)-Math.min(...values)>.2);
});
for(const id of FIELD_MICRO)test(id+': deterministic RGBA height map',()=>{const a=generateMicroTexture(9109,id,64);assert.deepEqual(a,generateMicroTexture(9109,id,64));assert.ok(new Set(a).size>8);for(let i=3;i<a.length;i+=4)assert.equal(a[i],255);});
test('new surfaces validate and are distinct',()=>{for(const s of Object.values(FIELD_SURFACES)){const g=preset('archivist');Object.assign(g.appearance,s);validateGenome(g);}assert.equal(new Set(FIELD_MICRO.map(id=>digest(generateMicroTexture(9,id,64)))).size,3);});
test('new full humanoid inspection template retains its props',()=>{const g=foundationBlueprint('fieldworker');assert.equal(g.parts.length,preset('lamplighter').parts.length);assert.equal(new FoundationCompiler(g).sample().excludedGenes,0);assert.equal(foundationBlueprint('balanced').parts.length,0);});
test('hand grips distinguish the correct side, scrolls, and quivers',()=>{const parts=expandParts(preset('waypostarcher'));assert.equal(handGrip(parts,1),.85);assert.equal(handGrip(parts,-1),0);assert.equal(handGrip([{socket:'hand',side:1,type:'bowrig',variant:2}],1),0);assert.equal(handGrip([{socket:'hand',side:1,type:'folio'}],1),.2);near(fingerCurl({handCurl:.4,weight:0},[],1),.09);});
test('bow string and drawing arm use the same phase envelope; idle bow is static',()=>{
 near(bowPull(0),0);near(bowPull(1),0);assert.ok(bowPull(.65)>.99);const cfg={...defaultHumanoidMotion(),action:'bowdraw'},p=sampleHumanoidAction(cfg,.65*2.8);assert.equal(equipmentAction('bowdraw',p).phase,p.phase);
 const plan=compileTidalPart(gene('bowrig',0)[0]),rest=sampleTidalPart(plan,0,{...animation,action:null}),still=sampleTidalPart(plan,1.3,{...animation,action:null}),pull=sampleTidalPart(plan,0,{...animation,action:{name:'bowdraw',phase:.65,weight:1}});rest.forEach((m,i)=>assert.deepEqual(m.positions,still[i].positions));assert.ok(rest.some((m,i)=>digest(m.positions)!==digest(pull[i].positions)));
});
test('book and bow mounts face upward in the active task poses, and quiver stays on the back',()=>{
 const a=preset('archivist').parts.find(p=>p.type==='folio');assert.ok(a.anchor[2]>.9);const q=preset('waypostarcher').parts.find(p=>p.type==='bowrig'&&p.variant===2);assert.equal(q.socket,'chest');assert.ok(q.anchor[1]>.9&&q.socketOffset[2]<-.4);
});
test('animal feet set only a fixed support height, not contact physics',()=>{const g=preset('trailhound'),a=analyze(g);assert.equal(a.legs,0);assert.ok(a.visualSupportPoints>=8);assert.ok(a.warnings.some(s=>s.includes('no collision shapes')));for(const p of expandParts(g).filter(p=>p.type==='beastleg'))for(const v of fieldSupportPoints(p))finite(v);});
test('new equipment retains factory detail materials under explicit material overrides',()=>{const p=gene('fieldlamp')[0];const plan=compileTidalPart({...p,material:'bone'});assert.ok(plan.components.some(c=>c.material==='glow'));assert.ok(plan.components.some(c=>c.material==='bone'));});
test('all new sources mix across rig families without modifying source blueprints',()=>{
 for(const id of FIELD_MODELS.map(m=>m.id))for(const other of ['mossback','clapshell','sailwing','archivist'])for(const t of [0,.5,1]){const a=preset(id),b=preset(other),before=serializeGenome(a),cfg=defaultMixSettings();for(const k in cfg.channels)cfg.channels[k]=t;const r=mixGenomes(a,b,cfg);validateGenome(r.genome);assert.equal(serializeGenome(a),before);const recipe=createMixRecipe(a,b,cfg);parseMixRecipe(JSON.stringify(recipe));}
});
test('solid helpers generate outward normals on known convex solids',()=>{for(const data of [box([0,0,0],[1,2,3]),prism([[-1,-1],[1,-1],[1,1],[-1,1]],.2)]){finite(data.positions);const normals=meshNormals(data.positions,data.indices);finite(normals);for(let i=0;i<data.positions.length;i+=3){const p=data.positions.slice(i,i+3),n=normals.subarray(i,i+3);assert.ok(p[0]*n[0]+p[1]*n[1]+p[2]*n[2]>0);}}});
