#!/usr/bin/env node
/** Installation report only. Browser evidence comes from System checks. */
import {readFile,writeFile} from 'node:fs/promises';
const checks=[];
for(const [id,want] of [['three','0.181.0'],['@dimforge/rapier3d-compat','0.19.3']]){
 try{const p=JSON.parse(await readFile(new URL('../node_modules/'+id+'/package.json',import.meta.url),'utf8'));checks.push({id,status:p.version===want?'pass':'fail',expected:want,actual:p.version});}catch(e){checks.push({id,status:'blocked',expected:want,reason:'Engine package is not installed.'});}
}
const report={format:'morph-lab-install-check',version:1,applicationVersion:'12.0.0',node:process.version,checks,browserTestsRun:false,gpuVerified:false,physicsVerified:false,instructions:'Run npm install, npm run dev, then System checks > Check engines + physics. Export that report.'};
const at=process.argv.indexOf('--out');if(at!==-1){if(!process.argv[at+1])throw new Error('Missing output path.');await writeFile(process.argv[at+1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(checks.some(c=>c.status!=='pass'))process.exitCode=2;
