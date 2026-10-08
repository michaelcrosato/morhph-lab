/** Technical checks are not an aesthetic score or a collision certificate. */
import {cross,sub} from './math.js';
export const TARGETS={desktop:{label:'Desktop prototype',triangles:100000,meshes:150},mobile:{label:'Mobile draft',triangles:25000,meshes:60},crowd:{label:'Crowd draft',triangles:10000,meshes:24}};
export function stableStringify(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value)||ArrayBuffer.isView(value))return '['+Array.from(value,stableStringify).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';}
export function fingerprint(value){const s=stableStringify(value);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return 'fnv1a32-'+(h>>>0).toString(16).padStart(8,'0');}
export function topology(data){
  const {positions,indices}=data,vertexCount=positions.length/3,edges=new Map(),parent=Array.from({length:vertexCount},(_,i)=>i),used=new Set();let degenerate=0,invalidIndices=0;
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<indices.length;i+=3){const ids=Array.from(indices.slice(i,i+3));if(ids.length!==3||ids.some(x=>!Number.isInteger(x)||x<0||x>=vertexCount)){invalidIndices++;continue;}
    const p=ids.map(x=>positions.slice(x*3,x*3+3)),normal=cross(sub(p[1],p[0]),sub(p[2],p[0]));if(Math.hypot(...normal)<1e-12)degenerate++;
    for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1);used.add(a);parent[root(a)]=root(b);}
  }
  return {components:new Set([...used].map(root)).size,boundaryEdges:[...edges.values()].filter(x=>x===1).length,nonManifoldEdges:[...edges.values()].filter(x=>x>2).length,degenerate,invalidIndices};
}
export function stretchData(mesh){
  const rest=mesh.restPositions,cur=mesh.positions,ratios=[],heat=new Float32Array(cur.length/3);if(!rest)return {p95:1,max:1,heat};
  const seen=new Set();for(let i=0;i<mesh.indices.length;i+=3)for(let k=0;k<3;k++){
    const a=mesh.indices[i+k],b=mesh.indices[i+(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(seen.has(key))continue;seen.add(key);
    let r=0,c=0;for(let j=0;j<3;j++){r+=(rest[a*3+j]-rest[b*3+j])**2;c+=(cur[a*3+j]-cur[b*3+j])**2;}if(r<1e-12)continue;
    const ratio=Math.sqrt(c/r),deform=Math.max(ratio,1/Math.max(ratio,1e-6));ratios.push(deform);heat[a]=Math.max(heat[a],deform);heat[b]=Math.max(heat[b],deform);
  }
  ratios.sort((a,b)=>a-b);return {p95:ratios[Math.floor((ratios.length-1)*.95)]||1,max:ratios.at(-1)||1,heat};
}
export function auditSnapshot(snapshot,target='desktop'){
  if(!TARGETS[target])throw new Error('Unknown review budget.');const budget=TARGETS[target];
  let vertices=0,triangles=0,nonFinite=0,invalidIndices=0,badWeights=0,degenerate=0,stretch95=1,stretchMax=1;
  const details=[];for(const mesh of snapshot.meshes){vertices+=mesh.positions.length/3;triangles+=mesh.indices.length/3;nonFinite+=Array.from(mesh.positions).filter(x=>!Number.isFinite(x)).length;nonFinite+=Array.from(mesh.normals).filter(x=>!Number.isFinite(x)).length;
    const t=mesh.name==='Body surface'?topology(mesh):null;if(t){invalidIndices+=t.invalidIndices;degenerate+=t.degenerate;}
    else {for(const i of mesh.indices)if(!Number.isInteger(i)||i<0||i>=mesh.positions.length/3)invalidIndices++;}
    if(mesh.skin)for(let i=0;i<mesh.skin.weights.length;i+=4){let sum=0;for(let j=0;j<4;j++){const w=mesh.skin.weights[i+j],bone=mesh.skin.indices[i+j];sum+=w;if(!Number.isFinite(w)||w<0||!Number.isInteger(bone)||bone<0||bone>=snapshot.boneCount)badWeights++;}if(Math.abs(sum-1)>1e-4)badWeights++;}
    const st=stretchData(mesh);stretch95=Math.max(stretch95,st.p95);stretchMax=Math.max(stretchMax,st.max);details.push({name:mesh.name,vertices:mesh.positions.length/3,triangles:mesh.indices.length/3,...(t?{topology:t}:{}),...(mesh.restPositions?{stretch:{p95:st.p95,max:st.max}}:{})});
  }
  const checks=[
    {key:'finite',status:nonFinite?'fail':'pass',label:'Finite positions and normals',value:nonFinite},
    {key:'indices',status:invalidIndices?'fail':'pass',label:'Valid triangle indices',value:invalidIndices},
    {key:'weights',status:badWeights?'fail':'pass',label:'Valid normalized skin weights',value:badWeights},
    {key:'body-degenerate',status:degenerate?'warning':'pass',label:'Zero-area body triangles',value:degenerate},
    {key:'triangles',status:triangles>budget.triangles?'warning':'pass',label:'Triangle budget',value:triangles,limit:budget.triangles},
    {key:'meshes',status:snapshot.meshes.length>budget.meshes?'warning':'pass',label:'Mesh budget (not draw calls)',value:snapshot.meshes.length,limit:budget.meshes},
    {key:'stretch',status:stretch95>1.8||stretchMax>4?'warning':'pass',label:'Pose edge distortion',value:stretch95,max:stretchMax}
  ];
  const body=details.find(d=>d.name==='Body surface')?.topology;if(body)checks.push({key:'body-closed',status:body.boundaryEdges||body.nonManifoldEdges||body.components!==1?'warning':'pass',label:'Body-only closed connected surface',value:body});
  return {format:'morph-lab-foundation-audit',version:1,blueprintFingerprint:fingerprint(snapshot.blueprint),backend:snapshot.backend,generator:snapshot.generator,pose:snapshot.pose,phase:snapshot.phase,timeSeconds:snapshot.sampleTimeSeconds??null,target,bounds:snapshot.bounds,totals:{meshes:snapshot.meshes.length,vertices,triangles,skinBones:snapshot.boneCount},checks,details,technicalStatus:checks.some(c=>c.status==='fail')?'fail':checks.some(c=>c.status==='warning')?'warning':'pass',visualStatus:'not-reviewed',coverage:snapshot.coverage,excludedGenes:snapshot.excludedGenes,inactiveGenes:snapshot.inactiveGenes||[],limits:['No self-intersection or cloth collision test.','No GPU shader or Rapier verification.','Pose stretch is an edge-length diagnostic, not a retargeting guarantee.','A technical pass does not establish visual quality.','Topology checks cover the implicit body, not an assembled watertight actor.']};
}
export function compareMasks(a,b){if(a.length!==b.length)throw new Error('Masks must use the same frame.');let intersection=0,union=0,changed=0;for(let i=0;i<a.length;i++){const x=!!a[i],y=!!b[i];if(x&&y)intersection++;if(x||y)union++;if(x!==y)changed++;}return {intersectionOverUnion:union?intersection/union:1,changedPixels:changed,unionPixels:union,note:'Aligned silhouette overlap. This is not a quality score.'};}
