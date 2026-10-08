/** Rebuild the examples through the same public functions as the editor. */
import {mkdir,writeFile} from 'node:fs/promises';
import {preset,createPart,validateGenome} from '../src/core/genome.js';
import {BLOOM_MODELS,BLOOM_KITS} from '../src/core/bloom-catalog.js';
import {defaultMixSettings,createMixRecipe,mixGenomes} from '../src/core/mixer.js';
import {applyPartKit} from '../src/core/kits.js';
import {applyPartArray} from '../src/core/part-arrays.js';
import {actorManifest,generateActorBatch} from '../src/core/actors.js';
import {ReviewSession} from '../src/review/session.js';
import {defaultMotion} from '../src/core/motion.js';
const dir=new URL('../examples/',import.meta.url);await mkdir(dir,{recursive:true});let count=0;
async function write(name,data){await writeFile(new URL(name,dir),JSON.stringify(data,null,2)+'\n');count++;}
for(const {id} of BLOOM_MODELS)await write(id+'.morph.json',preset(id));
for(const [a,b,seed,motion] of [['apiarist','thornenvoy',8121,.4],['clapshell','salpchain',8122,.65],['bloomkite','basketdrifter',8123,.7],['pebbleroller','duneauger',8124,.3]]){
 const s={...defaultMixSettings(),seed,topology:'a',channels:{body:.25,parts:.45,pigment:.6,surface:.6,motion}},A=preset(a),B=preset(b),key=a+'-'+b;
 await write(key+'.morphmix.json',createMixRecipe(A,B,s));await write(key+'-result.morph.json',mixGenomes(A,B,s).genome);
}
for(const [id,k] of Object.entries(BLOOM_KITS)){
 const source=preset(k.family==='humanoid'?'wayfarer':'sprout');source.parts=[];source.name=k.label+' foundation';
 await write('bloom-'+id+'-kit.morph.json',applyPartKit(validateGenome(source),id).genome);
}
for(const [layout,type,axis,count,anchor] of [['ring','whiskerfan','y',5,[1,.1,.1]],['row','petalcrown','z',4,[0,1,0]],['fan','trunk','y',3,[0,0,1]]]){
 let g=preset('sprout');g.parts=[];g.parts.push({...createPart(g,type,'core',anchor,false),size:.4,length:.8});g.motion=defaultMotion(layout==='row'?'bloomcycle':'sensorscan');g.name=layout+' array foundation';
 g=applyPartArray(validateGenome(g),g.parts[0].id,{layout,axis,count,spacing:.2,span:120,phaseStep:.17}).genome;
 await write('bloom-'+layout+'-array.morph.json',g);
}
for(const id of ['apiarist','shrinesentinel','clapshell','basketdrifter'])await write(id+'.actor.json',actorManifest(preset(id)));
await write('apiarist-workers.roster.json',generateActorBatch(preset('apiarist'),{count:6,seed:8125,variation:.25}));
await write('clapshell-colony.roster.json',generateActorBatch(preset('clapshell'),{count:6,seed:8126,variation:.25}));
for(const id of ['pebbleroller','clapshell','bloomkite','apiarist']){
 const r=new ReviewSession(preset(id));r.settings.pose='motion-cycle';r.settings.phase=.35;r.settings.shading='pattern';r.settings.view=id==='apiarist'?'quarter':'flight';r.notes='Actual procedural geometry. Check attachment and body clearance. CPU pigment is approximate. No GPU, physics, or production approval.';await write(id+'-motion.review.json',r.export());
}
console.log(`Wrote ${count} Carapace & Bloom examples.`);
