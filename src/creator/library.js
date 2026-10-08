/** Local discovery storage. A failed write keeps the in-memory library and warns. */
import {validateGenome} from '../core/genome.js';
import {replayRecipe, discoverySignature} from './generator.js';
export const LIBRARY_KEY='morph-lab.discoveries.v1';
export const MAX_DISCOVERIES=48;
export const MAX_COLLECTION_BYTES=8*1024*1024;
const copy=structuredClone;
function validatedItem(raw){
  if(!raw||typeof raw.id!=='string'||!/^d-[a-z0-9-]{1,70}$/.test(raw.id))throw new Error('Invalid discovery ID.');
  const genome=validateGenome(raw.genome);
  if(typeof raw.favorite!=='boolean'||typeof raw.createdAt!=='string'||!Number.isFinite(Date.parse(raw.createdAt)))throw new Error('Invalid discovery record.');
  const recipe=raw.recipe?replayRecipe(raw.recipe).recipe:null;
  if(recipe&&JSON.stringify(recipe.result)!==JSON.stringify(genome))throw new Error('Saved recipe does not match the discovery.');
  return {id:raw.id,genome,recipe,favorite:raw.favorite,createdAt:raw.createdAt};
}
export function parseCollection(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_COLLECTION_BYTES)throw new Error('Collection exceeds the 8 MB limit.');
  const raw=JSON.parse(text);
  if(raw?.format!=='morph-lab-discoveries'||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>MAX_DISCOVERIES)throw new Error('Invalid discovery collection.');
  const items=raw.items.map(validatedItem);if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error('Duplicate discovery IDs.');return items;
}
export class DiscoveryLibrary {
  constructor(storage=null,initial=null){
    this.storage=storage;this.items=[];this.warning='';this.persistent=!!storage;this.protectedStorage=false;
    if(initial){this.items=parseCollection(JSON.stringify(initial));}
    else if(storage){try{const text=storage.getItem(LIBRARY_KEY);if(text)this.items=parseCollection(text);}catch{this.warning='Saved collection could not be read. It was not overwritten. New saves stay in this session; export a backup.';this.protectedStorage=true;this.persistent=false;}}
    if(!storage)this.warning='Browser storage is unavailable. Saves last for this session only. Export your collection before closing.';
  }
  export(){return {format:'morph-lab-discoveries',version:1,items:copy(this.items)};}
  persist(){
    if(!this.storage||this.protectedStorage)return false;
    try{const text=JSON.stringify(this.export());if(new TextEncoder().encode(text).length>MAX_COLLECTION_BYTES)throw new Error('Collection exceeds its limit.');this.storage.setItem(LIBRARY_KEY,text);this.warning='';this.persistent=true;return true;}
    catch{this.persistent=false;this.warning='The browser could not save this collection. It is kept in this session. Export a backup before closing.';return false;}
  }
  save(value,createdAt=new Date().toISOString()){
    const genome=validateGenome(value.genome||value),fingerprint=JSON.stringify(genome),existing=this.items.find(x=>JSON.stringify(x.genome)===fingerprint);
    if(existing)return {item:copy(existing),duplicate:true,persistent:this.persistent};
    if(this.items.length>=MAX_DISCOVERIES)throw new Error('The collection has 48 discoveries. Export a backup, then remove an item.');
    const root='d-'+discoverySignature(genome);let id=root,serial=1;while(this.items.some(x=>x.id===id))id=root+'-'+serial++;
    const item=validatedItem({id,genome,recipe:value.recipe||null,favorite:false,createdAt});this.items.push(item);const persistent=this.persist();return {item:copy(item),duplicate:false,persistent};
  }
  get(id){const item=this.items.find(x=>x.id===id);if(!item)throw new Error('Discovery not found.');return copy(item);}
  favorite(id){const item=this.items.find(x=>x.id===id);if(!item)throw new Error('Discovery not found.');item.favorite=!item.favorite;this.persist();return item.favorite;}
  remove(id){if(!this.items.some(x=>x.id===id))throw new Error('Discovery not found.');this.items=this.items.filter(x=>x.id!==id);this.persist();}
  merge(text){
    const incoming=parseCollection(text),next=copy(this.items);let added=0;
    for(const item of incoming){
      const existing=next.find(x=>JSON.stringify(x.genome)===JSON.stringify(item.genome));if(existing){existing.favorite=existing.favorite||item.favorite;continue;}
      let id=item.id,serial=1;while(next.some(x=>x.id===id))id=item.id+'-'+serial++;
      next.push({...item,id});added++;
    }
    if(next.length>MAX_DISCOVERIES)throw new Error('Import would exceed 48 discoveries. Nothing was changed.');
    // Check the final document before committing. A failed import is atomic.
    parseCollection(JSON.stringify({format:'morph-lab-discoveries',version:1,items:next}));
    this.items=next;this.persist();return added;
  }
}
