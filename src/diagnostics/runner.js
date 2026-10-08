import {SKIN_NOISE_GLSL,SKIN_PATTERN_GLSL} from '../creature/shaders.js';
import {PATTERNS} from '../core/surfaces.js';
import {preset} from '../core/genome.js';
import {analyze} from '../core/anatomy.js';
import {makeLevel} from '../core/level.js';
import {makeTravelLevel} from '../core/travel-level.js';
import {PhysicsWorld} from '../physics/world.js';
export const ENGINE_PINS=Object.freeze({three:'181',rapier:'0.19.3'});
const pause=()=>new Promise(r=>setTimeout(r,0));
const clean=e=>String(e?.message||e).replace(/data:[^\s]+/g,'[embedded module]').replace(/(?:file|https?):\/\/[^\s]+/g,'[resource]').slice(0,500);
function stopped(signal){if(signal?.aborted){const e=new Error('System check cancelled.');e.name='AbortError';throw e;}}
export async function withDeadline(task,milliseconds=15000){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Engine load timed out. Check access to the pinned engine files.')),milliseconds);})]);}finally{clearTimeout(timer);}}
export function diagnosticStatus(checks,scope){if(checks.some(c=>c.status==='fail'))return 'fail';if(checks.some(c=>c.status==='blocked'))return 'blocked';return scope==='full'?'pass':'capabilities-only';}
export function verifyPin(actual,expected){if(String(actual)!==expected)throw new Error(`Engine version mismatch. Expected ${expected}; received ${actual}.`);return actual;}
/** Draw the actual procedural pattern GLSL. This is not Three.js material approval. */
function checkPatterns(gl){
  let program,vao,vs,fs;const records=[];
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message||'GLSL compile failed.');}return s;}
  try{vs=shader(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}');fs=shader(gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;uniform float kind;out vec4 color;${SKIN_NOISE_GLSL}\n${SKIN_PATTERN_GLSL}\nvoid main(){vec3 p=vec3(gl_FragCoord.xy*.14,.31);float v=clamp(skinPattern(p,kind,.35),0.0,1.0);color=vec4(v,.2+v*.6,.1,1.0);}`);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.useProgram(program);gl.viewport(0,0,32,32);const uniform=gl.getUniformLocation(program,'kind'),pixels=new Uint8Array(32*32*4);
    for(const [i,id] of PATTERNS.entries()){gl.uniform1f(uniform,i);gl.drawArrays(gl.TRIANGLES,0,3);gl.readPixels(0,0,32,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);if(gl.getError()!==gl.NO_ERROR||pixels[3]!==255||pixels[1]<45)throw new Error('Pattern draw/readback failed: '+id);let min=255,max=0;for(let k=0;k<pixels.length;k+=4){min=Math.min(min,pixels[k]);max=Math.max(max,pixels[k]);}records.push({pattern:id,min,max});}
    return {compiled:true,draws:records.length,readback:true,patterns:records,note:'Pattern source only. A separate test checks complete Three.js materials.'};
  }finally{if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
function physicsProbe(R,medium){
  const id=medium==='ground'?'wayfarer':medium==='water'?'moonbell':'glassdart',analysis=analyze(preset(id)),level=medium==='ground'?makeLevel(810):makeTravelLevel(810,medium);let physics;
  try{physics=new PhysicsWorld(R,analysis,level);for(let i=0;i<180;i++)physics.advance(1/60,{x:0,z:0,y:0});const start=physics.body.translation();const initial={x:start.x,y:start.y,z:start.z};
    for(let i=0;i<60;i++)physics.advance(1/60,{x:0,z:1,y:medium==='ground'?0:1});const end=physics.body.translation(),distance=Math.hypot(end.x-initial.x,end.z-initial.z),rise=end.y-initial.y;
    if(![end.x,end.y,end.z].every(Number.isFinite)||distance<.1||end.y<-.5)throw new Error('Controller did not move or fell outside the test area.');
    if(medium!=='ground'&&rise<.1)throw new Error('Vertical movement failed.');
    const record={medium,preset:id,start:initial,end:{...end},horizontalDistance:distance,rise,steps:240};
    physics.reset();const before={...physics.body.translation()};for(let i=0;i<30;i++)physics.advance(1/60,{x:0,z:0,y:0});if(!Object.values(before).every(Number.isFinite)||!Number.isFinite(physics.body.translation().y))throw new Error('Reset failed.');return record;
  }finally{physics?.dispose();}
}
async function threeProbe(THREE,signal){
  const {Creature}=await import('../creature/assemble.js'),{animateCreature}=await import('../creature/animator.js');stopped(signal);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const gl=canvas.getContext('webgl2',{antialias:false});if(!gl)throw new Error('Second WebGL2 context was unavailable.');
  let renderer,target,creature;const errors=[],records=[];
  try{renderer=new THREE.WebGLRenderer({canvas,context:gl,antialias:false});renderer.setSize(192,192,false);renderer.debug.checkShaderErrors=true;renderer.debug.onShaderError=(context,program,vs,fs)=>{errors.push([context.getProgramInfoLog(program),context.getShaderInfoLog(vs),context.getShaderInfoLog(fs)].join('\n').slice(0,1000));};
    target=new THREE.WebGLRenderTarget(192,192);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.01,250);scene.background=new THREE.Color('#172724');scene.add(new THREE.HemisphereLight(0xffffff,0x445544,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(5,8,4);scene.add(light);
    for(const id of ['wayfarer','trailhound','moonbell','glassdart','mossback']){stopped(signal);await pause();creature=new Creature(preset(id));scene.add(creature.root);animateCreature(creature,0,{time:.35,preview:true,seek:true});creature.root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(creature.root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,.5);camera.position.copy(center).add(new THREE.Vector3(span*1.8,span*.8,span*2.7));camera.lookAt(center);camera.updateMatrixWorld();renderer.compile(scene,camera);renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(192*192*4);renderer.readRenderTargetPixels(target,0,0,192,192,pixels);let changed=0;for(let i=4;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>12)changed++;if(errors.length||changed<30||gl.getError()!==gl.NO_ERROR)throw new Error(errors.join('\n')||`Blank or failed render: ${id}`);records.push({preset:id,changedPixels:changed,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls});scene.remove(creature.root);creature.dispose();creature=null;}
    return {models:records,shaderErrors:errors,note:'Five smoke-test models, not an approval of the whole library or visual quality.'};
  }finally{creature?.dispose();target?.dispose();renderer?.dispose();renderer?.forceContextLoss();}
}
/** Real capabilities and optional real engines. No injected success or engine mocks. */
export async function runDiagnostics({scope='local',signal,onCheck=()=>{},timeout=15000}={}){
  if(!['local','full'].includes(scope))throw new Error('Unknown system-check scope.');
  const started=performance.now(),report={format:'morph-lab-system-check',version:1,applicationVersion:'11.0.0',createdAt:new Date().toISOString(),scope,enginePins:{three:'0.181.0',rapier:'0.19.3'},environment:{protocol:location.protocol,secureContext:isSecureContext,webAssembly:typeof WebAssembly==='object'},checks:[],limitations:['No report is sent to a server.','Smoke tests do not approve visual quality, frame rate, all models, or a full gameplay session.','Blocked and skipped checks are not passes.']};
  async function record(id,label,fn,blocked=false){stopped(signal);onCheck({id,label,status:'running'});await pause();let item;try{const data=await fn();stopped(signal);item={id,label,status:'pass',data};}catch(error){if(error.name==='AbortError')throw error;item={id,label,status:blocked?'blocked':'fail',message:clean(error)};}report.checks.push(item);onCheck(item);return item;}
  function skip(id,label,reason){const item={id,label,status:'blocked',message:reason};report.checks.push(item);onCheck(item);}
  await record('wasm','WebAssembly',async()=>{if(typeof WebAssembly!=='object')throw new Error('WebAssembly is unavailable.');await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0]));return {compiled:true};},true);
  let context;
  await record('webgl2','WebGL2 context',()=>{const c=document.createElement('canvas');c.width=c.height=32;context=c.getContext('webgl2',{antialias:false});if(!context)throw new Error('No WebGL2 context. Enable browser graphics acceleration and check the graphics driver or browser policy.');return {version:context.getParameter(context.VERSION),maxTextureSize:context.getParameter(context.MAX_TEXTURE_SIZE),maxVertexAttributes:context.getParameter(context.MAX_VERTEX_ATTRIBS)};},true);
  if(context)await record('patterns','Procedural GLSL',()=>checkPatterns(context));else skip('patterns','Procedural GLSL','No WebGL2 context. Shader compilation was not tested.');
  if(scope==='full'){
    let THREE,R;
    await record('three-load','Load Three.js',async()=>{THREE=await withDeadline(import('three'),timeout);return {revision:THREE.REVISION};},true);
    if(THREE)await record('three-version','Three.js version',()=>({revision:verifyPin(THREE.REVISION,ENGINE_PINS.three)}));else skip('three-version','Three.js version','Engine was not loaded.');
    await record('rapier-load','Load Rapier',async()=>{const mod=await withDeadline(import('@dimforge/rapier3d-compat'),timeout);const loaded=mod.default||mod;await withDeadline(loaded.init(),timeout);R=loaded;return {version:R.version()};},true);
    if(R)await record('rapier-version','Rapier version',()=>({version:verifyPin(R.version(),ENGINE_PINS.rapier)}));else skip('rapier-version','Rapier version','Engine was not loaded.');
    if(R&&String(R.version())===ENGINE_PINS.rapier){for(const medium of ['ground','water','air'])await record('physics-'+medium,'Rapier: '+medium,()=>physicsProbe(R,medium));}else for(const medium of ['ground','water','air'])skip('physics-'+medium,'Rapier: '+medium,'The pinned physics engine was not initialized.');
    if(THREE&&String(THREE.REVISION)===ENGINE_PINS.three&&context)await record('three-render','Complete model render',()=>threeProbe(THREE,signal));else skip('three-render','Complete model render','The pinned Three.js engine and WebGL2 are both required.');
  }
  stopped(signal);report.durationMs=Math.round(performance.now()-started);report.status=diagnosticStatus(report.checks,scope);report.summary={passed:report.checks.filter(c=>c.status==='pass').length,failed:report.checks.filter(c=>c.status==='fail').length,blocked:report.checks.filter(c=>c.status==='blocked').length};return report;
}
