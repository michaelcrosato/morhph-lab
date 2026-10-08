import {validateGenome} from './genome.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** All editor changes flow through this transactional store. A slider drag can
 * preview many states but creates exactly one undo entry on commit. */
export class GenomeStore {
  constructor(genome,capacity=80){this._state=validateGenome(genome);this.capacity=capacity;this.past=[];this.future=[];this.listeners=new Set();this.previewBase=null;}
  get state(){return structuredClone(this._state);}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(kind,label=''){for(const fn of this.listeners)fn(this.state,{kind,label});}
  checkpoint(previous){this.past.push(previous);if(this.past.length>this.capacity)this.past.shift();this.future=[];}
  change(label,edit){this.commitPreview();const next=structuredClone(this._state);const result=edit(next);const valid=validateGenome(result||next);if(equal(valid,this._state))return;this.checkpoint(this._state);this._state=valid;this.emit('commit',label);}
  replace(genome,label='Load blueprint'){this.change(label,()=>genome);}
  preview(edit){const next=structuredClone(this._state);const result=edit(next);const valid=validateGenome(result||next);if(equal(valid,this._state))return;if(!this.previewBase)this.previewBase=this._state;this._state=valid;this.emit('preview');}
  commitPreview(){if(!this.previewBase)return;const base=this.previewBase;this.previewBase=null;if(!equal(base,this._state))this.checkpoint(base);this.emit('commit','Adjust anatomy');}
  cancelPreview(){if(!this.previewBase)return;this._state=this.previewBase;this.previewBase=null;this.emit('commit','Cancel adjustment');}
  undo(){this.commitPreview();if(!this.past.length)return false;this.future.push(this._state);this._state=this.past.pop();this.emit('history','Undo');return true;}
  redo(){this.commitPreview();if(!this.future.length)return false;this.past.push(this._state);this._state=this.future.pop();this.emit('history','Redo');return true;}
}
