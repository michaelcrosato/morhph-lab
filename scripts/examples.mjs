/** Portable examples use the same validated registries as the editor. */
import {mkdir,writeFile} from 'node:fs/promises';
import {preset,PRESET_MODELS,serializeGenome} from '../src/core/genome.js';
import {defaultMixSettings,mixGenomes,createMixRecipe} from '../src/core/mixer.js';
import {applyPartKit} from '../src/core/kits.js';
import {actorManifest,generateActorBatch} from '../src/core/actors.js';
import {FOUNDATIONS,foundationBlueprint,deriveFoundation,SHAPE_PROFILES,FoundationCompiler} from '../src/review/foundation.js';
import {ReviewSession} from '../src/review/session.js';
import {fitFrame} from '../src/review/raster.js';
import {syncHumanoidBody} from '../src/core/humanoid.js';
const directory=new URL('../examples/',import.meta.url);await mkdir(directory,{recursive:true});
const write=(name,value)=>writeFile(new URL(name,directory),JSON.stringify(value,null,2)+'\n');
for(const {id} of PRESET_MODELS)await writeFile(new URL(id+'.morph.json',directory),serializeGenome(preset(id))+'\n');
const pairs=[
  ['carapace','glider',{body:.35,parts:.68,pigment:.4,surface:.6,motion:.75},8128,'auto'],
  ['reef','lantern',{body:.25,parts:.55,pigment:.7,surface:.7,motion:.35},9217,'auto'],
  ['grazer','sentinel',{body:.35,parts:.6,pigment:.55,surface:.65,motion:.5},42,'auto'],
  ['warden','fiend',{body:.35,parts:.72,pigment:.45,surface:.65,motion:.4},7021,'auto'],
  ['wayfarer','ogre',{body:.45,parts:.5,pigment:.35,surface:.35,motion:.6},1934,'auto'],
  ['ranger','glider',{body:.2,parts:.8,pigment:.7,surface:.6,motion:0},9001,'a'],
  ['grovekeeper','clockwork',{body:.35,parts:.65,pigment:.4,surface:.5,motion:.25},4201,'a'],
  ['crownstag','shardback',{body:.4,parts:.75,pigment:.45,surface:.6,motion:.4},2311,'a'],
  ['oracle','sunmanta',{body:.2,parts:.65,pigment:.5,surface:.5,motion:.2},9182,'a']
];
for(const [aId,bId,channels,seed,topology] of pairs){
  const a=preset(aId),b=preset(bId),settings={...defaultMixSettings(),channels,seed,topology},name=aId+'-'+bId;
  await write(name+'.morphmix.json',createMixRecipe(a,b,settings));
  await write(name+'-result.morph.json',mixGenomes(a,b,settings).genome);
}
for(const id of ['wayfarer','warden','arcanist','duelist','grovekeeper','clockwork'])await write(id+'.actor.json',actorManifest(preset(id)));
await write('warden-patrol.roster.json',generateActorBatch(preset('warden'),{count:6,seed:8128,variation:.28}));
await write('travel-party.roster.json',generateActorBatch(preset('outrider'),{count:6,seed:4201,variation:.3}));
await write('guard-kit.morph.json',applyPartKit(preset('wayfarer'),'guard').genome);
await write('botanical-kit.morph.json',applyPartKit(preset('sprout'),'botanical').genome);
console.log(`Wrote ${PRESET_MODELS.length} model blueprints, ${pairs.length} mixer recipes, ${pairs.length} mix results, 6 actor manifests, 2 rosters, and 2 kit results.`);

for(const f of FOUNDATIONS)await write('foundation-'+f.id+'.morph.json',foundationBlueprint(f.id));
for(const id of Object.keys(SHAPE_PROFILES).filter(k=>k!=='unchanged')){const g=deriveFoundation(foundationBlueprint('balanced'),id);g.name=SHAPE_PROFILES[id].label;await write('derived-'+id+'.morph.json',g);}
const defined=foundationBlueprint('balanced'),classic=structuredClone(defined);classic.rig.bodyStyle='classic';syncHumanoidBody(classic);
const review=new ReviewSession(classic);review.setCandidate(defined);review.settings.layout='compare';review.frame=fitFrame([new FoundationCompiler(classic).sample(),new FoundationCompiler(defined).sample()]);review.notes='Compare the defined head and neck with the original soft blend. No production approval. Inspect joints, hands, clothing, game materials, and all required motions.';
await write('classic-defined.review.json',review.export());
console.log(`Added ${FOUNDATIONS.length} inspection foundations, 5 derivative recipes, and 1 comparison session.`);
