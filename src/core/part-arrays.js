import {validateGenome,createPart,LIMITS} from './genome.js';
import {rotate} from './parametric-mesh.js';
export const PART_ARRAY_LAYOUTS=Object.freeze({ring:'Ring',fan:'Fan',row:'Row'});
export const DEFAULT_PART_ARRAY=Object.freeze({layout:'ring',axis:'y',count:4,span:120,spacing:.20,phaseStep:.15});
/** Add independent copies. Count includes the selected source part.
 * A failed request does not change the blueprint. The editor owns one undo step.
 * Ring and fan change surface-anchor directions. Row changes local offsets.
 */
export function applyPartArray(source,id,raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Array settings must be an object.');
  const g=validateGenome(source),settings={...DEFAULT_PART_ARRAY,...raw},part=g.parts.find(p=>p.id===id);
  if(!part)throw new Error('Select an attachment before making an array.');
  if(!Object.hasOwn(PART_ARRAY_LAYOUTS,settings.layout))throw new Error('Unknown array layout.');
  if(!['x','y','z'].includes(settings.axis))throw new Error('Array axis must be X, Y, or Z.');
  for(const [key,min,max] of [['count',2,8],['span',5,330],['spacing',.02,.6],['phaseStep',0,1]]){
    const v=settings[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('Array '+key+' is out of range.');
  }
  if(!Number.isInteger(settings.count))throw new Error('Array count must be an integer.');
  if(g.parts.length+settings.count-1>LIMITS.parts)throw new Error('The array would exceed the 32-gene limit.');
  if(settings.layout!=='row'&&!['body','head','chest','pelvis'].includes(part.socket))throw new Error('Use Row on paired joint sockets. Ring and Fan could move copies to the opposite limb.');
  if(settings.layout!=='row'&&part.mirror)throw new Error('Turn off Mirror before making a ring or fan. This prevents duplicate pairs.');
  const axis='xyz'.indexOf(settings.axis),radial=Math.hypot(...part.anchor.filter((_,i)=>i!==axis));
  if(settings.layout!=='row'&&radial<.05)throw new Error('The anchor points along the rotation axis. Select another axis.');
  const added=[];
  for(let i=1;i<settings.count;i++){
    const next=createPart(g,part.type,part.host),key=next.id;
    Object.assign(next,structuredClone(part),{id:key});
    if(settings.layout==='row'){
      next.socketOffset[axis]+=settings.spacing*i;
      if(Math.abs(next.socketOffset[axis])>1)throw new Error('The row exceeds the local offset limit. Reduce count or spacing.');
    }else{
      const angle=settings.layout==='ring'?i*Math.PI*2/settings.count:i*settings.span*Math.PI/180/(settings.count-1);
      next.anchor=rotate(part.anchor,settings.axis,angle);next.socketOffset=rotate(part.socketOffset,settings.axis,angle);
      if(next.socketOffset.some(v=>Math.abs(v)>1))throw new Error('The array exceeds the local offset limit.');
    }
    // JSON has no signed zero. Keep new vectors canonical for exact round trips.
    next.anchor=next.anchor.map(v=>Object.is(v,-0)?0:v);next.socketOffset=next.socketOffset.map(v=>Object.is(v,-0)?0:v);
    next.phase=(part.phase+i*settings.phaseStep)%1;g.parts.push(next);added.push(key);
  }
  return {genome:validateGenome(g),added,settings};
}
