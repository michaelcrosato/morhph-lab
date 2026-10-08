import {readFile,copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'vendor'),{recursive:true});
for(const [source,destination] of [['three/build/three.module.js','three.module.js'],['three/build/three.core.js','three.core.js'],['@dimforge/rapier3d-compat/rapier.mjs','rapier.mjs'],['three/LICENSE','THREE-LICENSE'],['@dimforge/rapier3d-compat/LICENSE','RAPIER-LICENSE']]){
  try{await copyFile(path.join(root,'node_modules',source),path.join(root,'vendor',destination));console.log('Vendored',destination);}catch(error){if(destination.endsWith('LICENSE'))continue;throw new Error('Run npm install first. '+error.message);}
}
console.log('For a fully self-contained single HTML instead: npm run build -- --offline');
