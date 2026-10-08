/** Zero-build-dependency single-file packer using native browser import maps.
 * Generated modules are data URLs; libraries can be embedded or pinned to CDN.
 * This is intentionally not a minifier: exported source remains inspectable. */
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {packWorkspace} from './pack-workspace.mjs';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');await mkdir(out,{recursive:true});
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const imports={};
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
for(const file of (await walk(path.join(root,'src'))).filter(f=>f.endsWith('.js'))){
  const relative=path.relative(root,file).split(path.sep).join('/');
  const source=(await readFile(file,'utf8')).replace(/(\bfrom\s*|\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,(_,prefix,quote,spec)=>prefix+quote+'morph/'+path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec))+quote);
  imports['morph/'+relative]=data(source.replace(/(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,(_,prefix,quote,spec)=>prefix+quote+'morph/'+path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec))+quote)+'\n//# sourceURL=morph/'+relative);
}
let offline=false;
const notices=[];
try{notices.push(await readFile(path.join(root,'LICENSE'),'utf8'));}catch{}
try{
  if(process.argv.includes('--cdn'))throw new Error('CDN requested');
  const three=JSON.parse(await readFile(path.join(root,'node_modules/three/package.json'),'utf8'));
  const rapier=JSON.parse(await readFile(path.join(root,'node_modules/@dimforge/rapier3d-compat/package.json'),'utf8'));
  if(three.version!=='0.181.0'||rapier.version!=='0.19.3')throw new Error('Installed engines do not match the pinned versions.');
  imports['three/core']=data(await readFile(path.join(root,'node_modules/three/build/three.core.js'),'utf8'));
  imports.three=data((await readFile(path.join(root,'node_modules/three/build/three.module.js'),'utf8')).replaceAll("'./three.core.js'","'three/core'"));
  const rapierSource=await readFile(path.join(root,'node_modules/@dimforge/rapier3d-compat',rapier.module||'rapier.mjs'),'utf8');
  if(/from\s*['"]\.\//.test(rapierSource))throw new Error('Rapier compat entry has additional relative imports; inspect before embedding.');
  imports['@dimforge/rapier3d-compat']=data(rapierSource);offline=true;
  // Preserve full notices even when the HTML is redistributed on its own.
  for(const folder of ['three','@dimforge/rapier3d-compat']){
    const dir=path.join(root,'node_modules',folder);
    for(const filename of await readdir(dir)){
      if(/^(LICENSE|COPYING|NOTICE)([.\-_]|$)/i.test(filename)){
        try{notices.push(folder+' / '+filename+'\n'+await readFile(path.join(dir,filename),'utf8'));}catch{}
      }
    }
  }
}catch(error){
  if(process.argv.includes('--offline'))throw error;
  imports.three='https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
  imports['@dimforge/rapier3d-compat']='https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';
  console.log('CDN edition:',error.message);
}
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${await readFile(path.join(root,'style.css'),'utf8')}</style>`);
html=html.replace('<link rel="stylesheet" href="./review.css">',`<style>${await readFile(path.join(root,'review.css'),'utf8')}</style>`);
html=html.replace('<link rel="stylesheet" href="./creator.css">',`<style>${await readFile(path.join(root,'creator.css'),'utf8')}</style>`);
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script type="importmap">${JSON.stringify({imports}).replaceAll('<','\\u003c')}</script>`);
html=html.replace("import './src/boot.js'", "import 'morph/src/boot.js'");
html=html.replace('<title>Morph Lab','<!-- '+(offline?'OFFLINE EDITION: engines embedded':'CDN EDITION: engines require internet')+' -->\n<title>Morph Lab');
html=html.replace('<!doctype html>','<!doctype html>\n<!-- LICENSE NOTICES\n'+notices.join('\n\n').replaceAll('-->','-- >')+'\nEND LICENSE NOTICES -->');
// Keep an unwrapped artifact for engine and editor tests; ship the combined shell.
await writeFile(path.join(out,'runtime.html'),html);
const workshop=await packWorkspace(html,'workshop');
const review=await packWorkspace(html,'review');
const creator=await packWorkspace(html,'creator');
await writeFile(path.join(out,'index.html'),creator);
await writeFile(path.join(out,'Morph-Lab.html'),creator);
await writeFile(path.join(out,'Morph-Lab-Review.html'),review);
await writeFile(path.join(out,'Morph-Lab-Workshop.html'),workshop);
await writeFile(path.join(out,'Morph-Lab-Creator.html'),creator);
await writeFile(path.join(out,'build-info.json'),JSON.stringify({edition:offline?'offline':'cdn',three:'0.181.0',rapier:'0.19.3',modules:Object.keys(imports).length,bytes:Buffer.byteLength(creator),combined:true,version:'12.0.0'},null,2));
console.log(`Built ${offline?'offline':'CDN'} single-file edition: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`);
// Redistributed library notices stay alongside the artifact.
for(const f of ['LICENSE','THIRD-PARTY-NOTICES.md'])try{await copyFile(path.join(root,f),path.join(out,f));}catch{}
