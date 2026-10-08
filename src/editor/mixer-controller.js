import {preset} from '../core/genome.js';
import {defaultMixSettings,mixGenomes,createMixRecipe,parseMixRecipe,MIX_CHANNELS} from '../core/mixer.js';
import {parseActorInput} from '../core/actors.js';
import {rng} from '../core/math.js';
const STORAGE_KEY='morph-lab.mixer.v9';
/** A separate, reversible preview session. Sources are snapshots, never the last
 * preview result. Repeated slider events therefore cannot accumulate mutations. */
export class MixerController {
  constructor(store){this.store=store;this.sources={a:store.state,b:preset('glider')};this.labels={a:'snapshot',b:'glider'};this.frozen=store.state;this.settings=defaultMixSettings();this.notes=[];this.stats=null;this.previewing=false;}
  get state(){return {sources:structuredClone(this.sources),labels:{...this.labels},settings:structuredClone(this.settings),notes:[...this.notes],stats:this.stats?{...this.stats}:null,previewing:this.previewing};}
  onStoreEvent(event){if(event.kind!=='preview')this.previewing=false;}
  setSource(slot,value){if(!['a','b'].includes(slot))throw new Error('Unknown mixer source.');this.sources[slot]=value==='snapshot'?this.store.state:preset(value);this.labels[slot]=value;if(this.previewing)this.preview();}
  importSource(slot,text){if(!['a','b'].includes(slot))throw new Error('Unknown mixer source.');this.sources[slot]=parseActorInput(text);this.labels[slot]='file';if(this.previewing)this.preview();}
  setLock(key,locked){if(!Object.hasOwn(MIX_CHANNELS,key))throw new Error('Unknown mixer channel.');if(locked)this.frozen=this.store.state;this.settings.locks[key]=locked;}
  master(value){for(const k of Object.keys(MIX_CHANNELS))if(!this.settings.locks[k])this.settings.channels[k]=value;}
  randomize(){this.settings.seed=(this.settings.seed+1)>>>0;const r=rng(this.settings.seed);for(const k of Object.keys(MIX_CHANNELS))if(!this.settings.locks[k])this.settings.channels[k]=Math.round(r()*100)/100;}
  preview(){const result=mixGenomes(this.sources.a,this.sources.b,this.settings,this.frozen);this.previewing=true;this.store.preview(()=>result.genome);this.notes=result.notes;this.stats=result.stats;return result;}
  commit(){if(!this.previewing)this.preview();this.store.commitPreview();this.previewing=false;}
  cancel(){if(this.previewing)this.store.cancelPreview();this.previewing=false;this.notes=[];this.stats=null;}
  recipe(){return createMixRecipe(this.sources.a,this.sources.b,this.settings,this.frozen);}
  importRecipe(text){const recipe=parseMixRecipe(text);this.sources=recipe.sources;this.labels={a:'file',b:'file'};this.settings=recipe.settings;this.frozen=recipe.frozen;this.notes=[];this.stats=null;if(this.previewing)this.preview();}
  save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(this.recipe()));}
  load(){const text=localStorage.getItem(STORAGE_KEY)||localStorage.getItem('morph-lab.mixer.v8')||localStorage.getItem('morph-lab.mixer.v7')||localStorage.getItem('morph-lab.mixer.v6')||localStorage.getItem('morph-lab.mixer.v5')||localStorage.getItem('morph-lab.mixer.v4')||localStorage.getItem('morph-lab.mixer.v3')||localStorage.getItem('morph-lab.mixer.v1');if(!text)throw new Error('No mixer recipe is saved on this device.');this.importRecipe(text);}
}
