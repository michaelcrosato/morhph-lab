import test from 'node:test';
import assert from 'node:assert/strict';
import {TIDAL_PARTS,TIDAL_MODELS,TIDAL_KITS} from '../src/core/tidal-catalog.js';
import {TIDAL_PATTERNS,TIDAL_MICRO,TIDAL_SURFACES} from '../src/core/tidal-surfaces.js';
import {CATALOG} from '../src/core/catalog.js';
import {preset,createPart,validateGenome,serializeGenome,parseGenome} from '../src/core/genome.js';
import {analyze,expandParts} from '../src/core/anatomy.js';
import {compileTidalPart,sampleTidalPart,placeTidalPoint} from '../src/core/tidal-geometry.js';
import {defaultMotion,sampleMotion,MOTION_CLIPS} from '../src/core/motion.js';
import {defaultTravel,defaultBodyWave,validateTravel,validateBodyWave,travelVelocity,deformBodyPoint,deformBodyFrame} from '../src/core/travel.js';
import {makeTravelLevel} from '../src/core/travel-level.js';
import {mixGenomes,defaultMixSettings,createMixRecipe,parseMixRecipe} from '../src/core/mixer.js';
import {applyPartKit} from '../src/core/kits.js';
import {appearanceLayers,generateMicroTexture} from '../src/core/surfaces.js';
import {reviewPattern,sampleReviewPigment} from '../src/review/pigment.js';
import {FoundationCompiler} from '../src/review/foundation.js';
import {rasterize,fitFrame} from '../src/review/raster.js';
import {ReviewSession,parseReviewSession} from '../src/review/session.js';
import {actorManifest,generateActorBatch,parseActorRoster} from '../src/core/actors.js';
const finite=a=>assert.ok(Array.from(a).every(Number.isFinite));
const close=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<=e,`${a} differs from ${b}`);
const all=t=>{const s=defaultMixSettings();for(const k in s.channels)s.channels[k]=t;return s;};
function part(type,variant=0,mirror=false){const g=preset('sprout');g.parts=[{...createPart(g,type,'core',[1,.2,.2],mirror),variant,size:.8,length:1.1}];return expandParts(validateGenome(g));}
const flapping=sampleMotion(defaultMotion('powerflight'),{preview:true});
test('Tide & Sky inventory is distinct and complete',()=>{
 assert.equal(TIDAL_MODELS.length,16);assert.equal(TIDAL_MODELS.filter(m=>m.medium==='water').length,8);assert.equal(TIDAL_MODELS.filter(m=>m.medium==='air').length,8);assert.equal(Object.keys(TIDAL_PARTS).length,15);
 assert.equal(new Set(TIDAL_MODELS.map(m=>JSON.stringify(preset(m.id).nodes))).size,16);
 for(const [k,v] of Object.entries(TIDAL_PARTS)){assert.ok(CATALOG[k]);assert.equal(new Set(v.variants).size,3);}
});
for(const type of Object.keys(TIDAL_PARTS))for(let variant=0;variant<3;variant++)test(`${type}/${variant}: indexed finite geometry, immutable plan, deterministic reuse`,()=>{
 const p=part(type,variant)[0],plan=compileTidalPart(p),before=plan.components.map(c=>c.positions.slice()),a=sampleTidalPart(plan,.237,flapping),b=sampleTidalPart(plan,.237,flapping);
 assert.ok(a.length>0);
 for(let i=0;i<a.length;i++){const c=a[i];assert.ok(c.indices.length>=3);finite(c.positions);finite(c.normals);assert.equal(c.positions.length,c.normals.length);assert.ok(c.indices.every(n=>n<c.positions.length/3));assert.deepEqual(c.positions,b[i].positions);assert.deepEqual(plan.components[i].positions,before[i]);assert.notEqual(c.positions,plan.components[i].positions);}
 const reuse=sampleTidalPart(plan,1.734,flapping,a);assert.equal(reuse[0].positions,a[0].positions);const first=sampleTidalPart(plan,.237,flapping,reuse);for(let i=0;i<b.length;i++)assert.deepEqual(first[i].positions,b[i].positions);
 assert.throws(()=>sampleTidalPart(plan,NaN));
});
for(const type of Object.keys(TIDAL_PARTS))test(type+': mirrored rest and animated geometry share a reflected silhouette',()=>{
 const pair=part(type,1,true);assert.equal(pair.length,2);
 for(const t of [0,.237,1.71]){const [a,b]=pair.map(p=>sampleTidalPart(compileTidalPart(p),t,flapping));for(let c=0;c<a.length;c++)for(let i=0;i<a[c].positions.length;i+=21){if(i+2>=a[c].positions.length)break;const x=placeTidalPoint(a[c].positions.subarray(i,i+3),pair[0]),y=placeTidalPoint(b[c].positions.subarray(i,i+3),pair[1]);close(x[0],-y[0]);close(x[1],y[1]);close(x[2],y[2]);}}
});
for(const {id,medium} of TIDAL_MODELS)test(id+': full offline geometry, animation, serialization and actor contract',()=>{
 const g=preset(id),serialized=serializeGenome(g),c=new FoundationCompiler(g),rest=c.sample({pose:'bind'}),a=c.sample({pose:'motion-cycle',phase:.13}),b=c.sample({pose:'motion-cycle',phase:.37});
 assert.equal(g.motion.travel.medium,medium);assert.deepEqual(parseGenome(serialized),g);assert.equal(a.excludedGenes,0);assert.ok(a.meshes.length>1);assert.equal(a.meshes.length,b.meshes.length);
 let diff=0;for(let i=0;i<a.meshes.length;i++){finite(a.meshes[i].positions);finite(a.meshes[i].normals);for(let j=0;j<a.meshes[i].positions.length;j+=13)diff+=Math.abs(a.meshes[i].positions[j]-b.meshes[i].positions[j]);}
 assert.ok(diff>.01);assert.equal(serializeGenome(g),serialized);assert.deepEqual(c.sample({pose:'bind'}).meshes[0].positions,rest.meshes[0].positions);
 const render=rasterize(a,{width:96,height:96,view:'flight',shading:'pattern',frame:fitFrame([a,b])});assert.ok(render.mask.reduce((a,b)=>a+b,0)>40);assert.equal(render.clipped,0);
 assert.equal(actorManifest(g).contract.travel.medium,medium);assert.ok(analyze(g).compatibility.locomotion.includes('soar'));
 const roster=generateActorBatch(g,{count:3,seed:991,variation:.6});assert.deepEqual(parseActorRoster(JSON.stringify(roster)),roster);assert.ok(roster.actors.every(a=>a.blueprint.motion.travel.medium===medium));
});
for(const id of TIDAL_PATTERNS)test(id+': deterministic CPU pigment with a bounded nonconstant signal',()=>{
 const samples=[];for(let i=0;i<400;i++){const p=[i*.076,Math.sin(i)*1.7,i*.19];const a=reviewPattern(id,p,.2);assert.equal(a,reviewPattern(id,p,.2));assert.ok(a>=0&&a<=1);samples.push(a);}
 assert.ok(Math.max(...samples)-Math.min(...samples)>.1);
});
for(const id of TIDAL_MICRO)test(id+': generated microtexture is repeatable and not flat',()=>{
 const a=generateMicroTexture(17,id),b=generateMicroTexture(17,id);assert.deepEqual(a,b);assert.ok(new Set(a).size>5);assert.equal(a.length,128*128*4);
});
test('all added surface recipes produce valid layered appearance',()=>{for(const def of Object.values(TIDAL_SURFACES)){const g=preset('needleswimmer');Object.assign(g.appearance,def);const a=validateGenome(g).appearance;assert.equal(appearanceLayers(a).length,1);finite(sampleReviewPigment(a,[.4,.8,.2],[140,120,100]));}});
test('old version 5 files default to ground travel and rigid bodies',()=>{for(const id of ['wayfarer','mossback']){const old=preset(id);old.version=5;delete old.motion.travel;delete old.motion.bodyWave;for(const k of ['cruise','undulate','jet','row','soar','powerflight','flutter','float'])delete old.motion.weights[k];const g=validateGenome(old);assert.equal(g.version,6);assert.deepEqual(g.motion.travel,defaultTravel());assert.deepEqual(g.motion.bodyWave,defaultBodyWave());assert.equal(Object.keys(g.motion.weights).length,37);}});
test('unknown travel and deformation values are rejected before use',()=>{for(const x of [{medium:'space'},null,[],{medium:'water',speed:NaN},{medium:'water',climb:-1},{medium:'air',bank:2}])assert.throws(()=>validateTravel(x));for(const x of [{kind:'rubber'},[],null,{kind:'lateral',amplitude:9},{kind:'pulse',frequency:Infinity}])assert.throws(()=>validateBodyWave(x));});
for(const medium of ['water','air'])test(medium+': normalized 3-axis controller, height/radius limits, reset volume and no ground fallback',()=>{
 const c={...defaultTravel(),medium},bounds={radius:20,minY:1,maxY:11},pos={x:0,y:5,z:0};assert.deepEqual(travelVelocity(c,{x:0,y:0,z:0},pos,bounds),{x:0,y:0,z:0});
 const v=travelVelocity(c,{x:1,y:1,z:1},pos,bounds);close(Math.hypot(v.x/c.speed,v.y/c.climb,v.z/c.speed),1);assert.ok(v.y>0);
 const up=travelVelocity(c,{y:1},{x:0,y:12,z:0},bounds),down=travelVelocity(c,{y:-1},{x:0,y:0,z:0},bounds);assert.ok(up.y<0);assert.ok(down.y>0);
 assert.ok(travelVelocity(c,{x:1},{x:22,y:5,z:0},bounds).x<0);
 assert.throws(()=>travelVelocity(c,{x:Infinity},pos,bounds));assert.throws(()=>travelVelocity(c,{},pos,{...bounds,minY:12}));
 const level=makeTravelLevel(810,medium);assert.equal(level.medium,medium);assert.equal(level.spores.length,8);assert.ok(new Set(level.spores.map(s=>s.y)).size>1);assert.ok(level.spawnY>level.travelBounds.minY&&level.spawnY<level.travelBounds.maxY);
});
test('ground movement cannot use the aquatic target controller',()=>assert.throws(()=>travelVelocity(defaultTravel(),{},{x:0,y:0,z:0})));
for(const kind of ['lateral','vertical','pulse'])test(kind+': deformation and surface normals remain finite without accumulating edits',()=>{const w={...defaultBodyWave(),kind,amplitude:.65};for(const time of [0,.123,1.31,20]){const p=[.4,.6,-1.7],before=[...p],q=deformBodyPoint(p,w,time);finite(q);assert.deepEqual(p,before);assert.deepEqual(q,deformBodyPoint(p,w,time));const f=deformBodyFrame(p,[0,1,0],w,time);finite(f.normal);close(Math.hypot(...f.normal),1);assert.deepEqual(f.position,q);}});
test('water-air mixing has explicit discrete travel while retaining continuous motion and locks',()=>{
 const a=preset('ribbondrift'),b=preset('sailwing');for(const t of [0,.25,.5,.75,1]){const r=mixGenomes(a,b,all(t));assert.equal(r.genome.motion.travel.medium,t<.5?'water':'air');close(r.genome.motion.travel.speed,a.motion.travel.speed+(b.motion.travel.speed-a.motion.travel.speed)*t);assert.ok(r.notes.some(n=>n.includes('Travel medium')));}
 const locked=all(.9);locked.locks.motion=true;assert.deepEqual(mixGenomes(a,b,locked,a).genome.motion,a.motion);
 const recipe=createMixRecipe(a,b,all(.31));assert.deepEqual(parseMixRecipe(JSON.stringify(recipe)),recipe);
});
test('non-ground clips stay active at rest without injected walking weights',()=>{for(const clip of ['cruise','undulate','jet','row','soar','powerflight','flutter','float']){const m=defaultMotion(clip);m.travel.medium='air';const a=sampleMotion(m,{preview:true}),b=sampleMotion(m,{speed:0,preview:false});for(const k of ['rate','flap','wingOpen','pulse','paddle'])close(a[k],b[k]);}});
test('rear insect wing kit stores the requested opposing phase',()=>{const g=applyPartKit(preset('sprout'),'fourwing').genome;assert.ok(g.parts.some(p=>p.type==='insectwing'&&p.phase===.5));});
test('all six kits use registered factories and preserve sources',()=>{for(const key of Object.keys(TIDAL_KITS)){const g=preset('sprout'),before=serializeGenome(g),out=applyPartKit(g,key);assert.equal(serializeGenome(g),before);assert.ok(out.added.length>0);validateGenome(out.genome);}});
test('review sessions preserve motion-cycle, raised camera and approximate pigment settings',()=>{const s=new ReviewSession(preset('moonbell'));Object.assign(s.settings,{pose:'motion-cycle',phase:.23,shading:'pattern',view:'flight'});const round=parseReviewSession(JSON.stringify(s.export()));assert.deepEqual(round.export(),s.export());});
