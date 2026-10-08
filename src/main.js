import {FrameClock} from './core/frame-clock.js';
import {openDeliveryPanel} from './export/panel.js';
import {openDiagnostics} from './diagnostics/panel.js';
import {foundationBlueprint} from './review/foundation.js';
import {enterFoundationReview,enterCreator,takeWorkshopTransfer} from './review/transfer.js';
import {captureRuntimeReview} from './render/review-capture.js';
import {restPickPoint} from './render/picking.js';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {defaultMotion} from './core/motion.js';
import {preset} from './core/genome.js';
import {GenomeStore} from './core/store.js';
import {analyze,nearestNode} from './core/anatomy.js';
import {Creature} from './creature/assemble.js';
import {animateCreature} from './creature/animator.js';
import {Stage} from './render/stage.js';
import {Habitat} from './game/habitat.js';
import {PhysicsWorld} from './physics/world.js';
import {View} from './ui/view.js';
import {icon,escapeHTML} from './ui/icons.js';
import {Editor,loadSaved,downloadBlob,safeFilename} from './editor/editor.js';

const view=new View();
let stage,creature,editor,habitat,physics,store,lastRuntimeReview;
let previewPlaying=true,previewTime=0,previewSeek=false,transportClock=0;
let mode='editor',walking=false,dirty=false,frameRequested=false,lastBuild=0,stopped=false,completed=false;
const frameClock=new FrameClock(.1);
let clock=0,fpsFrames=0,fpsTime=0,debugTime=0;
const keys=new Set(),tmp=new THREE.Vector3();
function applyOptions(){if(!creature||!editor)return;creature.guides.visible=editor.options.guides&&mode==='editor';if(creature.humanoid)creature.humanoid.guides.visible=editor.options.rigGuides&&mode==='editor';creature.setWireframe(editor.options.wireframe);stage.debug.visible=editor.options.debug&&mode==='habitat';creature.select(editor.selected);}
function rebuild(){
  if(!dirty&&creature)return;
  const genome=store.state;
  // Body shape is independent of appendages/pigment. Reuse its vertex data when
  // topology is unchanged; each runtime retains exclusive GPU resource ownership.
  const surface=creature&&JSON.stringify(genome.nodes)===JSON.stringify(creature.genome.nodes)?creature.restSurface:null;
  const next=new Creature(genome,undefined,surface);next.root.position.y=next.analysis.restHeight;
  if(creature){next.phase=creature.phase;creature.dispose();}
  creature=next;stage.scene.add(creature.root);animateCreature(creature,0,{time:previewTime,preview:true,seek:true});applyOptions();
  dirty=false;lastBuild=performance.now();
  if(frameRequested){stage.frame(creature);frameRequested=false;}
}
function showSelection(){
  if(mode!=='editor'||!creature){stage.selection.visible=false;return;}
  // Highlight both members of a symmetric gene as one editable structure.
  const matches=creature.parts.filter(p=>p.part.id===editor.selected);
  if(matches.length){stage.selection.box.makeEmpty();for(const p of matches)stage.selection.box.expandByObject(p.group);stage.selection.visible=true;}
  else stage.selection.visible=false;
}
function clearFeet(){for(const leg of creature.legs)leg.step=null;}
function enterHabitat(){
  if(mode==='habitat')return;
  editor.store.commitPreview();if(dirty)rebuild();editor.arm(null);keys.clear();
  habitat=new Habitat(810,creature.analysis.travel);
  try{physics=new PhysicsWorld(RAPIER,creature.analysis,habitat.level,habitat.solids,(id,count)=>{
    habitat.collect(id);view.toast(count===8?'Expedition complete. A new organism finds its feet.':`Spore ${count} / 8 collected`);
    if(count===8)completed=true;
  });}catch(error){habitat.dispose();habitat=null;throw error;}
  stage.scene.add(habitat.root);
  mode='habitat';editor.habitat=true;completed=false;clearFeet();creature.root.position.set(0,creature.analysis.restHeight+.15,0);creature.root.rotation.set(0,0,0);habitat.root.visible=true;stage.setMode(true);stage.target.set(0,creature.analysis.restHeight*.6,0);view.mode(true);view.travelControls(creature.analysis.travel.medium);applyOptions();view.progress(0,0,0);stage.resize();frameClock.reset();
  document.querySelector('#scene').focus({preventScroll:true});
}
function leaveHabitat(){
  if(mode!=='habitat')return;
  keys.clear();physics.dispose();physics=null;habitat.dispose();habitat=null;mode='editor';editor.habitat=false;completed=false;
  clearFeet();creature.root.position.set(0,creature.analysis.restHeight,0);creature.root.rotation.set(0,0,0);creature.torso.rotation.set(0,0,0);stage.setMode(false);stage.key.position.set(5,9,6);stage.key.target.position.set(0,0,0);view.mode(false);view.closeDialog();frameClock.reset();applyOptions();stage.resize();animateCreature(creature,0,{time:previewTime,preview:true,seek:true});stage.frame(creature);
}
function completeTrial(){
  if(!completed||document.querySelector('#dialog').open)return;completed=false;keys.clear();
  const elapsed=physics.elapsed,name=escapeHTML(store.state.name);
  view.dialog(`<span class="eyebrow">FIRST EXPEDITION / COMPLETE</span><h2>${name}<br>is a natural.</h2><p>Eight spores collected. Your blueprint has become a moving, world-interacting organism.</p><div class="completion-stat"><div><b>${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,'0')}</b><span>expedition time</span></div><div><b>${Math.floor(physics.distance)} m</b><span>distance travelled</span></div><div><b>${physics.jumps}</b><span>leaps of faith</span></div></div><p class="fine-copy">Try fewer limbs, a longer body, or a different gait. Return to the workshop and continue the experiment.</p><button class="primary" data-action="editor">Back to workshop ${icon('arrow')}</button><button class="quiet" data-action="retry">Try again</button>`);
}
async function action(name,el){
  if(name==='creator'){if(mode==='habitat')leaveHabitat();store?.commitPreview();enterCreator(store?.state);return;}
  if(name==='system-checks'){openDiagnostics();return;}
  if(name==='delivery'){if(mode==='habitat')leaveHabitat();store.commitPreview();openDeliveryPanel(store.state,{pose:'bind',phase:0});return;}
  if(name==='review'){if(mode==='habitat')leaveHabitat();store.commitPreview();enterFoundationReview(store.state);return;}
  if(name==='runtime-sheet'){if(mode!=='editor')throw new Error('Return to the workshop for a runtime sheet.');store.commitPreview();lastRuntimeReview=captureRuntimeReview(stage.renderer,store.state,{time:previewTime});const blob=await (await fetch(lastRuntimeReview.image)).blob();downloadBlob(blob,safeFilename(store.state.name)+'-runtime-review.png','image/png');view.toast('Full runtime sheet captured. Export the runtime record to retain its recipe.');return;}
  if(name==='runtime-record'){if(!lastRuntimeReview)throw new Error('Capture a runtime sheet first.');downloadBlob(JSON.stringify(lastRuntimeReview.manifest,null,2),safeFilename(lastRuntimeReview.manifest.blueprint.name)+'.runtime-review.json');return;}
  if(name==='preview-toggle')previewPlaying=!previewPlaying;
  if(name==='preview-reset'){previewTime=0;previewSeek=true;if(creature.humanoid){creature.humanoid.actionStart=0;creature.humanoid.lastActionTime=0;}}
  if(name==='human-replay'){previewPlaying=true;if(creature.humanoid){creature.humanoid.actionKey=null;creature.humanoid.lastActionTime=0;}}
  if(name==='preview-seek'){previewTime=Number(el.value);previewPlaying=false;previewSeek=true;}
  view.transport(previewPlaying,previewTime);
  if(name==='test')enterHabitat();
  if(name==='editor')leaveHabitat();
  if(name==='retry'){view.closeDialog();leaveHabitat();enterHabitat();}
  if(name==='frame'){if(mode==='editor'){if(dirty)rebuild();stage.frame(creature);}else{stage.target.copy(creature.root.position);stage.radius=10;}}
  if(name==='walk'||name==='idle'){store.change('Set preview motion',g=>{g.motion.weights=defaultMotion(name).weights;});previewPlaying=true;view.motion(name==='walk');}
  if(name==='capture'){
    const data=stage.capture(),blob=await (await fetch(data)).blob();downloadBlob(blob,safeFilename(store.state.name)+'.png','image/png');view.toast('Creature portrait captured.');
  }
}
function movement(){
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const s=Math.sin(stage.theta),c=Math.cos(stage.theta);
  return {x:-s*forward+c*right,z:-c*forward-s*right,y:(keys.has('Space')||keys.has('KeyE')?1:0)-(keys.has('KeyQ')||keys.has('ControlLeft')||keys.has('ControlRight')?1:0),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')};
}
function loop(now){
  if(stopped)return;requestAnimationFrame(loop);
  const dt=frameClock.tick(now,document.hidden);if(document.hidden)return;
  if(!document.querySelector('#dialog').open)clock+=dt;
  try{
    if(dirty&&performance.now()-lastBuild>65&&mode==='editor')rebuild();
    if(!creature)return;
    const paused=document.querySelector('#dialog').open;
    if(mode==='habitat'){
      const alpha=paused?1:physics.advance(dt,movement());const pose=physics.sample(alpha);
      creature.root.position.fromArray(pose.position);creature.root.rotation.y=pose.yaw;
      animateCreature(creature,paused?0:dt,{time:clock,speed:paused?0:pose.speed,bank:pose.bank,grounded:physics.grounded,groundHeight:(x,z)=>physics.groundHeight(x,z)});
      habitat.update(clock,paused?0:dt,physics);
      stage.target.lerp(tmp.copy(creature.root.position).add(new THREE.Vector3(0,-.25,0)),1-Math.exp(-dt*5));
      stage.key.position.copy(creature.root.position).add(new THREE.Vector3(5,9,6));stage.key.target.position.copy(creature.root.position);
      view.progress(physics.collected.size,physics.elapsed,physics.distance);
      if(editor.options.debug){debugTime+=dt;if(debugTime>.09){stage.setDebug(physics.world.debugRender());debugTime=0;}}
      completeTrial();
    }else{
      if(previewPlaying)previewTime+=dt;
      animateCreature(creature,previewPlaying?dt:0,{time:previewTime,preview:true,speed:0,grounded:true,seek:previewSeek});previewSeek=false;showSelection();
      transportClock+=dt;if(transportClock>.08){view.transport(previewPlaying,previewTime);transportClock=0;}
    }
    stage.render();fpsFrames++;fpsTime+=dt;
    if(fpsTime>=.8){view.stats(Math.round(fpsFrames/fpsTime),stage.renderer.info.render.triangles,stage.renderer.info.render.calls);fpsFrames=0;fpsTime=0;}
  }catch(error){console.error(error);stopped=true;view.fail(error);}
}
async function boot(){
  if(THREE.REVISION!=='181')throw new Error(`Expected Three.js r181; received r${THREE.REVISION}.`);
  stage=new Stage(document.querySelector('#scene'),error=>{stopped=true;view.fail(error);});
  // The compat package embeds its WASM; no separate WASM URL or bundler plugin.
  await RAPIER.init();
  if(RAPIER.version()!=='0.19.3')throw new Error(`Expected Rapier 0.19.3; received ${RAPIER.version()}.`);
  store=new GenomeStore(takeWorkshopTransfer()||loadSaved()||foundationBlueprint('balanced'));
  editor=new Editor(store,view,{
    changed:g=>{if(creature&&JSON.stringify(g.rig)===JSON.stringify(creature.genome.rig)&&JSON.stringify(g.nodes)===JSON.stringify(creature.genome.nodes)&&JSON.stringify(g.parts)===JSON.stringify(creature.genome.parts)){if(JSON.stringify(g.appearance)!==JSON.stringify(creature.genome.appearance)||g.seed!==creature.genome.seed)creature.updateAppearance(g);else creature.genome=g;creature.analysis=analyze(g);}else dirty=true;},selected:()=>{applyOptions();},options:applyOptions,
    armed:()=>{stage.marker.visible=false;},frame:()=>{frameRequested=true;dirty=true;previewTime=0;previewSeek=true;},action
  });
  dirty=true;frameRequested=true;rebuild();
  stage.onPick=e=>{
    if(mode!=='editor')return;
    try{
      if(editor.armed){const hit=stage.ray(e,creature.mountTargets||[creature.body])[0];if(hit){if(hit.object.userData.rigSocket){const bone=creature.humanoid.bones[hit.object.userData.socketBone];const point=bone.worldToLocal(hit.point.clone()).normalize();editor.placeAtSocket(hit.object.userData.rigSocket,bone.name.endsWith('.R')?-1:1,point.toArray());}else editor.place(restPickPoint(hit,creature).toArray());}else view.toast('Click the creature’s skin to place the part.');}
      else{const hit=stage.ray(e,creature.pickables)[0];if(!hit)return;if(hit.object.userData.geneId)editor.select(hit.object.userData.geneId);else{const p=restPickPoint(hit,creature);editor.select(nearestNode(p.toArray(),creature.analysis.nodes).id);}}
    }catch(error){view.toast(error.message);}
  };
  stage.onHover=e=>{if(mode!=='editor'||!editor.armed){stage.marker.visible=false;return;}const hit=stage.ray(e,creature.mountTargets||[creature.body])[0];stage.marker.visible=!!hit;if(hit)stage.marker.position.copy(hit.point);};
  document.addEventListener('keydown',e=>{
    if(mode!=='habitat'||document.querySelector('#dialog').open||e.target.matches('input,textarea,select'))return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
    if(e.code==='Space'&&!e.repeat&&!physics.afloat)physics.queueJump();
    if(e.code==='KeyR'&&!e.repeat){physics.reset();clearFeet();view.toast('Returned to the start. Collected spores are kept.');}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{keys.clear();frameClock.reset();if(physics)physics.accumulator=0;});
  // Read-only diagnostics for reproducible browser smoke tests and bug reports.
  Object.defineProperty(window,'morphLab',{value:Object.freeze({
    actor:()=>({family:creature.genome.rig.family,bones:creature.humanoid?.spec.length||0,pose:creature.humanoid?.pose||null,events:creature.humanoid?.events||[],sockets:creature.parts.map(p=>({id:p.part.id,socket:p.part.socket,parent:p.group.parent?.name}))}),
    captureRuntimeReview:(options)=>captureRuntimeReview(stage.renderer,store.state,options),
    mixer:()=>editor.mixer.state,
    preview:()=>({playing:previewPlaying,time:previewTime}),
    versions:()=>({three:THREE.REVISION,rapier:RAPIER.version(),webgl2:stage.renderer.getContext() instanceof WebGL2RenderingContext}),
    snapshot:()=>({mode,genome:store.state,analysis:analyze(store.state),history:{undo:store.past.length,redo:store.future.length},renderer:{...stage.renderer.info.memory},position:creature.root.position.toArray(),spores:physics?.collected.size||0}),
    ready:true
  })});
  view.ready();frameClock.reset();requestAnimationFrame(loop);
}
boot().catch(error=>{console.error(error);view.fail(error);window.dispatchEvent(new CustomEvent('morph-lab:startup-error',{detail:error}));});
