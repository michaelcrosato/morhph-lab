import {requestedWorkspace} from './core/workspace-route.js';
import {enterFoundationReview,enterCreator} from './review/transfer.js';

const mode=window.__MORPH_WORKSPACE__?.workspace || requestedWorkspace(location.search,
  document.querySelector('meta[name="morph-default-workspace"]')?.content);
function fail(error) {
  console.error(error);
  const app=document.querySelector('#app');
  app.className='';
  app.replaceChildren();
  const panel=document.createElement('section');
  panel.id='startup-error';
  panel.style.cssText='max-width:720px;margin:8vh auto;padding:32px;font:16px/1.6 system-ui;color:#263731';
  const heading=document.createElement('h1');
  heading.textContent=mode==='workshop'?'Workshop could not start':mode==='creator'?'Creator could not start':'Inspector could not start';
  const message=document.createElement('p');
  message.textContent=mode==='workshop'
    ? 'The workshop is included in this file. It needs its Three.js and Rapier engine files, and a browser with WebGL2. In the internet edition, check your connection and access to the engine CDN. You can still use the inspector offline.'
    : 'The inspector could not start. Use the saved blueprint or review file to restore your work.';
  const details=document.createElement('p');
  details.id='startup-error-detail';
  details.textContent=String(error?.message || error).replace(/data:[^\s]+/g,'[embedded module]').slice(0,500);
  details.style.cssText='font-size:13px;overflow-wrap:anywhere';
  const back=document.createElement('button');
  back.id='startup-inspect';back.textContent='Return to Inspect';
  back.style.cssText='padding:12px 20px;cursor:pointer;background:#375f50;color:white;border:1px solid #375f50;border-radius:6px;font:inherit';
  back.addEventListener('click',()=>enterFoundationReview(window.__MORPH_WORKSPACE__?.genome));
  const checks=document.createElement('button');checks.id='startup-system-checks';checks.textContent='System checks';checks.style.cssText=back.style.cssText+';margin-left:12px;background:white;color:#375f50';checks.onclick=()=>import('./diagnostics/panel.js').then(m=>m.openDiagnostics()).catch(e=>{details.textContent=String(e.message);});const create=document.createElement('button');create.id='startup-creator';create.textContent='Return to Creator';create.style.cssText=back.style.cssText+';margin-right:12px';create.onclick=()=>enterCreator(window.__MORPH_WORKSPACE__?.genome);panel.append(heading,message,details,create,back,checks);app.append(panel);
}
window.addEventListener('morph-lab:startup-error', event=>fail(event.detail));
(mode==='creator' ? import('./creator/app.js') : mode==='review' ? import('./review/app.js') : import('./main.js')).catch(fail);
