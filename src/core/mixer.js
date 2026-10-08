import {blendRigs,syncHumanoidBody,compatibilityReport} from './humanoid.js';
import {ACTOR_RANGES} from './actors.js';
import {validateGenome,LIMITS} from './genome.js';
import {appearanceLayers,setAppearanceLayer} from './surfaces.js';
import {blendMotion} from './motion.js';
import {resolveNodes} from './anatomy.js';
import {clamp,mix,normalize,shortestAngle,rng,hash} from './math.js';
export const MIX_CHANNELS=Object.freeze({body:'Body shape',parts:'Appendages',pigment:'Pigment',surface:'Surface layers',motion:'Motion'});
export const MIX_RECIPE_VERSION=1;
export function defaultMixSettings(){return {channels:{body:.5,parts:.5,pigment:.5,surface:.5,motion:.5},locks:Object.fromEntries(Object.keys(MIX_CHANNELS).map(k=>[k,false])),topology:'auto',mutation:0,seed:8128};}
export function validateMixSettings(raw=defaultMixSettings()){
  const out=defaultMixSettings();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Mixer settings must be an object.');
  for(const group of ['channels','locks'])if(raw[group]!==undefined&&(!raw[group]||typeof raw[group]!=='object'||Array.isArray(raw[group])))throw new Error('Mixer '+group+' must be an object.');
  for(const key of Object.keys(MIX_CHANNELS)){
    const value=raw.channels?.[key]??out.channels[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw new Error('Mixer channel must be between 0 and 1.');out.channels[key]=value;
    const locked=raw.locks?.[key]??false;if(typeof locked!=='boolean')throw new Error('Mixer lock must be true or false.');out.locks[key]=locked;
  }
  if(raw.topology!==undefined&&!['auto','a','b'].includes(raw.topology))throw new Error('Unknown mixer topology.');out.topology=raw.topology??'auto';
  if(raw.mutation!==undefined&&(typeof raw.mutation!=='number'||!Number.isFinite(raw.mutation)||raw.mutation<0||raw.mutation>1))throw new Error('Mutation must be between 0 and 1.');out.mutation=raw.mutation??0;
  if(raw.seed!==undefined&&(!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295))throw new Error('Mixer seed must be an unsigned 32-bit integer.');out.seed=(raw.seed??out.seed)>>>0;return out;
}
/** Assign each node a stable structural path. IDs may differ between source files. */
export function nodePaths(g){
  const out=new Map(),children=new Map();for(const n of g.nodes){const parent=n.parent??'__root__';if(!children.has(parent))children.set(parent,[]);children.get(parent).push(n);}
  for(const list of children.values())list.sort((a,b)=>a.id.localeCompare(b.id));
  const visit=(n,path)=>{out.set(n.id,path);(children.get(n.id)||[]).forEach((c,i)=>visit(c,path+'/'+i));};visit(g.nodes.find(n=>n.parent===null),'0');return out;
}
const lerpVector=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
function blendDirection(a,b,t){
  const d=a.reduce((s,v,i)=>s+v*b[i],0);
  if(d<-.999){const axis=normalize(Math.abs(a[1])<.8?[-a[2],0,a[0]]:[0,-a[2],a[1]]);return a.map((v,i)=>v*Math.cos(Math.PI*t)+axis[i]*Math.sin(Math.PI*t));}
  return normalize(lerpVector(a,b,t),a);
}
function blendAngle(a,b,t){const v=a+shortestAngle(a,b)*t;return Math.atan2(Math.sin(v),Math.cos(v));}
/** Mix pigment in linear light rather than averaging sRGB byte values. */
export function mixColor(a,b,t){
  const decode=c=>{const v=c/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  const encode=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055));
  return '#'+[1,3,5].map(i=>encode(mix(decode(parseInt(a.slice(i,i+2),16)),decode(parseInt(b.slice(i,i+2),16)),t)).toString(16).padStart(2,'0')).join('');
}
function blendSurfaces(a,b,t,notes){
  if(t===0)return structuredClone(a);if(t===1)return structuredClone(b);
  const out=structuredClone(a);
  for(const k of ['roughness','metalness','relief','emission','strength'])out[k]=mix(a[k],b[k],t);
  out.micro=t<.5?a.micro:b.micro;out.textureSeed=t<.5?a.textureSeed:b.textureSeed;
  const all=[];
  for(const [source,w] of [[a,1-t],[b,t]]){
    const layers=appearanceLayers(source),total=Math.max(1,layers.reduce((s,l)=>s+l.weight,0));
    for(const l of layers)if(l.weight*w>1e-6){const layer={...l,weight:l.weight*w/total};const match=all.find(x=>x.pattern===l.pattern&&x.scale===l.scale&&x.angle===l.angle&&x.warp===l.warp);if(match)match.weight+=layer.weight;else all.push(layer);}
  }
  all.sort((a,b)=>b.weight-a.weight);if(all.length>4)notes.push('The four strongest pigment layers were kept.');
  const kept=all.slice(0,4);if(!kept.length)kept.push({...appearanceLayers(a)[0],weight:0});
  out.layers=[];kept.forEach((l,i)=>setAppearanceLayer(out,i,l));return out;
}
function safeBody(nodes,notes){
  const map=new Map(nodes.map(n=>[n.id,n]));let repaired=false;
  for(const n of nodes)if(n.parent){const p=map.get(n.parent),max=Math.min(...n.radii)+Math.min(...p.radii)+.045,d=Math.hypot(...n.offset);if(d>max){n.offset=n.offset.map(v=>v*max/d);repaired=true;}}
  const resolved=resolveNodes({nodes});let scale=1;
  for(const n of resolved)for(let i=0;i<3;i++)if(Math.abs(n.center[i])>1e-8)scale=Math.min(scale,(6.98-n.radii[i])/Math.abs(n.center[i]));
  if(scale<1){for(const n of nodes)n.offset=n.offset.map(v=>v*scale);repaired=true;}
  if(repaired)notes.push('Body offsets were shortened to keep segments connected and inside the workspace.');
  return nodes;
}
/** Blend recipes, not meshes. The source graphs remain immutable. Body graph
 * changes are discrete; paired dimensions and compatible attachments interpolate. */
export function mixGenomes(sourceA,sourceB,settings=defaultMixSettings(),frozen=sourceA){
  const a=validateGenome(sourceA),b=validateGenome(sourceB),s=validateMixSettings(settings),keep=validateGenome(frozen),notes=[];
  const weights=s.channels,pathsA=nodePaths(a),pathsB=nodePaths(b);
  let owner=s.topology==='a'?a:s.topology==='b'?b:weights.body<.5?a:b;
  if(s.locks.body)owner=keep;
  const result=structuredClone(owner),ownerPaths=nodePaths(owner),nodesA=new Map(a.nodes.map(n=>[pathsA.get(n.id),n])),nodesB=new Map(b.nodes.map(n=>[pathsB.get(n.id),n]));
  const crossRig=a.rig.family!==b.rig.family;
  if(s.locks.body){result.rig=structuredClone(keep.rig);result.actor=structuredClone(keep.actor);}
  else if(!crossRig){result.rig=blendRigs(a.rig,b.rig,weights.body);for(const key of Object.keys(ACTOR_RANGES))result.actor[key]=mix(a.actor[key],b.actor[key],weights.body);}
  if(crossRig)notes.push('Rig family follows the body source. Creature and humanoid skeletons do not morph. Compatible skin and attachments still mix.');
  if(result.rig.family==='humanoid')syncHumanoidBody(result);
  else if(crossRig)result.nodes=structuredClone(owner.nodes);
  else if(!s.locks.body)result.nodes=safeBody(owner.nodes.map(n=>{const path=ownerPaths.get(n.id),na=nodesA.get(path),nb=nodesB.get(path);return na&&nb?{...n,radii:lerpVector(na.radii,nb.radii,weights.body),offset:lerpVector(na.offset,nb.offset,weights.body)}:structuredClone(n);}),notes);
  else result.nodes=structuredClone(keep.nodes);
  const targetPaths=nodePaths(result),pathToId=new Map([...targetPaths].map(([id,path])=>[path,id])),root=result.nodes.find(n=>n.parent===null).id;
  const hostFor=(g,p)=>{if(crossRig){if(result.nodes.some(n=>n.id===p.host)&&p.host==='head')return 'head';if(result.rig.family==='humanoid')return p.host==='head'?'head':p.host==='core'?'chest':result.nodes.some(n=>n.id===p.host)?p.host:'chest';if(p.host==='head'&&result.nodes.some(n=>n.id==='head'))return 'head';return root;}const paths=g===a?pathsA:g===b?pathsB:nodePaths(g);let path=paths.get(p.host);while(path&&!pathToId.has(path))path=path.includes('/')?path.slice(0,path.lastIndexOf('/')):null;return pathToId.get(path)||root;};
  if(s.locks.parts)result.parts=keep.parts.map(p=>({...p,host:hostFor(keep,p)}));
  else if(weights.parts===0||weights.parts===1){const source=weights.parts===0?a:b;result.parts=source.parts.map(p=>({...p,host:hostFor(source,p)}));}
  else{
    const signature=(g,paths)=>{const count=new Map();return g.parts.map(p=>{const prefix=p.type+'@'+paths.get(p.host)+'@'+(p.socket||'body'),i=count.get(prefix)||0;count.set(prefix,i+1);return [prefix+':'+i,p];});};
    const entriesA=signature(a,pathsA),entriesB=new Map(signature(b,pathsB)),emitted=[];
    for(const [key,pa] of entriesA){const pb=entriesB.get(key);entriesB.delete(key);const t=weights.parts,p={...pa,host:hostFor(a,pa)};
      if(pb){for(const k of ['size','length','flex','bend','presence'])p[k]=mix(pa[k],pb[k],t);p.anchor=blendDirection(pa.anchor,pb.anchor,t);p.twist=blendAngle(pa.twist,pb.twist,t);p.phase=(pa.phase+shortestAngle(pa.phase*Math.PI*2,pb.phase*Math.PI*2)/(Math.PI*2)*t+1)%1;p.socket=t<.5?pa.socket:pb.socket;p.socketOffset=lerpVector(pa.socketOffset,pb.socketOffset,t);p.material=t<.5?pa.material:pb.material;p.variant=t<.5?pa.variant:pb.variant;p.mirror=t<.5?pa.mirror:pb.mirror;}
      else p.presence*=1-t;
      emitted.push(p);
    }
    for(const pb of entriesB.values())emitted.push({...pb,host:hostFor(b,pb),presence:pb.presence*weights.parts});
    // Bound geometry work. Keep the most visible genes. Stable ties preserve order.
    const retained=emitted.map((p,i)=>({p,i})).filter(x=>x.p.presence>.005).sort((a,b)=>b.p.presence-a.p.presence||a.i-b.i).slice(0,LIMITS.parts).sort((a,b)=>a.i-b.i);
    if(emitted.length>LIMITS.parts)notes.push('The 32 most visible attachment genes were kept.');
    result.parts=retained.map(({p},i)=>({...p,id:'mix-part-'+(i+1)}));
  }
  // IDs are globally unique, including when the body source has part-like IDs.
  const ids=new Set(result.nodes.map(n=>n.id));for(const p of result.parts){let candidate=p.id,i=1;while(ids.has(candidate))candidate='mix-gene-'+i++;p.id=candidate;ids.add(candidate);}
  result.appearance=s.locks.surface?structuredClone(keep.appearance):blendSurfaces(a.appearance,b.appearance,weights.surface,notes);
  for(const k of ['color','accent'])result.appearance[k]=s.locks.pigment?keep.appearance[k]:mixColor(a.appearance[k],b.appearance[k],weights.pigment);
  result.motion=s.locks.motion?structuredClone(keep.motion):blendMotion(a.motion,b.motion,weights.motion);
  if(a.motion.travel.medium!==b.motion.travel.medium)notes.push('Travel medium follows the motion channel: A below 50%, B at or above 50%. This is an arcade controller setting, not a rig conversion.');
  result.name=(a.name+' × '+b.name).slice(0,40);result.generation=Math.min(999999,Math.max(a.generation,b.generation)+1);result.seed=s.seed;
  if(s.mutation>0){const r=rng(s.seed);if(!s.locks.parts)for(const p of result.parts){p.size=clamp(p.size*(1+(r()-.5)*s.mutation*.55),.35,2.1);p.length=clamp(p.length*(1+(r()-.5)*s.mutation*.55),.45,2);p.bend=clamp(p.bend+(r()-.5)*s.mutation,-1,1);}
    if(!s.locks.body&&result.rig.family!=='humanoid'){const f=1+(r()-.5)*s.mutation*.2;result.nodes=safeBody(result.nodes.map(n=>({...n,radii:n.radii.map(v=>clamp(v*f,.25,2.4)),offset:n.offset.map(v=>clamp(v*f,-3,3))})),notes);}
  }
  const graphA=[...pathsA.values()].join(','),graphB=[...pathsB.values()].join(',');if(graphA!==graphB)notes.push('Body graph follows '+(owner===a?'source A':owner===b?'source B':'the frozen body')+'. Unmatched body nodes do not crossfade.');
  if(result.rig.family==='humanoid')syncHumanoidBody(result);
  const genome=validateGenome(result);notes.push(...compatibilityReport(genome).notes);
  return {genome,notes,stats:{bodyNodes:genome.nodes.length,genes:genome.parts.length,patternLayers:appearanceLayers(genome.appearance).length,signature:hash(JSON.stringify(genome)).toString(16)}};
}
export function createMixRecipe(a,b,settings,frozen=a){return {format:'morph-lab-mixer',version:MIX_RECIPE_VERSION,sources:{a:validateGenome(a),b:validateGenome(b)},settings:validateMixSettings(settings),frozen:validateGenome(frozen)};}
export function parseMixRecipe(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>1048576)throw new Error('Mixer recipe exceeds 1 MB.');
  const raw=JSON.parse(text);if(raw?.format!=='morph-lab-mixer'||raw.version!==MIX_RECIPE_VERSION)throw new Error('Unsupported mixer recipe.');
  return createMixRecipe(raw.sources?.a,raw.sources?.b,raw.settings,raw.frozen??raw.sources?.a);
}
