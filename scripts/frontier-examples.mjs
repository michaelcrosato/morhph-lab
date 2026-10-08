/** Strange Forms examples. Each file uses the same public contract as the editor. */
import {mkdir,writeFile} from 'node:fs/promises';
import {preset,validateGenome} from '../src/core/genome.js';
import {FRONTIER_MODELS,FRONTIER_KITS} from '../src/core/frontier-catalog.js';
import {defaultMixSettings,createMixRecipe,mixGenomes} from '../src/core/mixer.js';
import {applyPartKit} from '../src/core/kits.js';
import {actorManifest,generateActorBatch} from '../src/core/actors.js';
import {ReviewSession} from '../src/review/session.js';
const directory=new URL('../examples/',import.meta.url);await mkdir(directory,{recursive:true});
const write=(name,data)=>writeFile(new URL(name,directory),JSON.stringify(data,null,2)+'\n');
for(const {id} of FRONTIER_MODELS)await write(id+'.morph.json',preset(id));
for(const [a,b,seed,motion] of [['salpchain','oarshrimp',7121,.4],['hoopglider','pleatdrake',7122,.65],['starweaver','sievewisp',7123,.7]]){
  const settings={...defaultMixSettings(),seed,topology:'a',channels:{body:.25,parts:.45,pigment:.6,surface:.6,motion}},name=a+'-'+b;
  const sourceA=preset(a),sourceB=preset(b);
  await write(name+'.morphmix.json',createMixRecipe(sourceA,sourceB,settings));
  await write(name+'-result.morph.json',mixGenomes(sourceA,sourceB,settings).genome);
}
for(const id of Object.keys(FRONTIER_KITS)){
  const source=preset('sprout');source.parts=[];source.name='Foundation with '+FRONTIER_KITS[id].label;
  await write(id+'-kit.morph.json',applyPartKit(validateGenome(source),id).genome);
}
for(const id of ['comblantern','starweaver','hoopglider','ductmanta'])await write(id+'.actor.json',actorManifest(preset(id)));
await write('comb-school.roster.json',generateActorBatch(preset('comblantern'),{count:6,seed:7124,variation:.25}));
await write('duct-flock.roster.json',generateActorBatch(preset('ductmanta'),{count:6,seed:7125,variation:.2}));
for(const id of ['salpchain','starweaver','sievewisp']){
  const session=new ReviewSession(preset(id));session.settings.pose='motion-cycle';session.settings.phase=.3;session.settings.shading='pattern';session.settings.view='flight';session.notes='Inspect the generated body and Strange Forms parts. CPU pigment is an approximation. No GPU, physics, or production approval.';
  await write(id+'-motion.review.json',session.export());
}
console.log('Wrote 12 Strange Forms models, 3 mixer recipes and results, 6 kit results, 4 actor manifests, 2 rosters, and 3 review sessions.');
