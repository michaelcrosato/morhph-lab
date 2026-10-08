/** Full-catalog, engine-free regression sweep. Warnings are retained, not approved. */
import {mkdir,writeFile} from 'node:fs/promises';
import {PRESET_MODELS} from '../src/core/presets.js';
import {CLASSIC_PARTS} from '../src/core/classic-catalog.js';
import {preset} from '../src/core/genome.js';
import {FoundationCompiler} from '../src/review/foundation.js';
import {auditSnapshot} from '../src/review/audit.js';
import {rasterize,fitFrame} from '../src/review/raster.js';
import {encodePNG} from './png.mjs';
const out=new URL('../test-results/v11/catalog/',import.meta.url);await mkdir(out,{recursive:true});const records=[],render=process.argv.includes('--render');
for(const spec of PRESET_MODELS){
 const g=preset(spec.id),migrated=g.parts.some(p=>Object.hasOwn(CLASSIC_PARTS,p.type)),compiler=new FoundationCompiler(g),samples=Array.from({length:8},(_,i)=>compiler.sample({pose:'motion-cycle',phase:i/8})),frame=fitFrame(samples),images=[];
 const poses=samples.map(s=>{const a=auditSnapshot(s);return {phase:s.phase,technicalStatus:a.technicalStatus,totals:a.totals,checks:a.checks,excludedGenes:s.excludedGenes,inactiveGenes:s.inactiveGenes};});
 if(render&&migrated)for(let i=0;i<8;i++){
  const image=rasterize(samples[i],{width:380,height:380,frame,view:'quarter',shading:'material'}),file=spec.id+'-'+i+'.png';await writeFile(new URL(file,out),encodePNG(380,380,image.pixels));images.push({file,phase:i/8,clipped:image.clipped,maskPixels:image.mask.reduce((a,b)=>a+b,0)});
 }
 records.push({id:spec.id,label:spec.label,migrated,frame,poses,images});console.log(spec.id,poses.map(x=>x.technicalStatus).join(','));
}
const samples=records.flatMap(r=>r.poses),counts={models:records.length,samples:samples.length,pass:samples.filter(s=>s.technicalStatus==='pass').length,warning:samples.filter(s=>s.technicalStatus==='warning').length,fail:samples.filter(s=>s.technicalStatus==='fail').length,excludedGenes:samples.reduce((n,s)=>n+s.excludedGenes,0),images:records.flatMap(r=>r.images).length,clippedImages:records.flatMap(r=>r.images).filter(i=>i.clipped).length};
await writeFile(new URL('report.json',out),JSON.stringify({version:'11.0.0',counts,records,gpuVerified:false,physicsVerified:false,visualApproval:false,note:'Full catalog across eight phases. Rendered evidence covers the 24 previously incomplete presets. Technical pass is not intersection, anatomy, or game approval.'},null,2));console.log(counts);if(counts.fail)process.exitCode=1;
