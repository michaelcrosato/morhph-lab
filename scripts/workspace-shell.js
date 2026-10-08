/* Single-document launcher. Only the active workspace has a live iframe. */
(() => {
  'use strict';
  const bytes=Uint8Array.from(atob(document.querySelector('#morph-document').textContent.trim()), c=>c.charCodeAt(0));
  const documentHTML=new TextDecoder().decode(bytes);
  const host=document.querySelector('#workspace-host');
  let frame=null,active='',genome=null,review=null,creator=null;
  const status=document.querySelector('#workspace-status');

  function capture() {
    if(!frame)return;
    // srcdoc contains our own bundled application. Imported JSON never executes.
    try {
      const child=frame.contentWindow;
      if(active==='creator' && child.monsterCreator?.ready){
        creator=child.monsterCreator.snapshot();genome=creator.session.current.genome;
      } else if(active==='review' && child.foundationReview?.ready){
        review=child.foundationReview.snapshot();genome=review.candidate;
      } else if(active==='workshop' && child.morphLab?.ready){
        genome=child.morphLab.snapshot().genome;
      }
    } catch(error) { console.warn('Workspace snapshot not available:',error.message); }
  }
  function openWorkspace(workspace,payload={}) {
    if(!['creator','review','workshop'].includes(workspace))return;
    if(active===workspace && frame)return;
    capture();
    if(payload.genome)genome=payload.genome;
    if(payload.review)review=payload.review;
    active=workspace;
    const state=JSON.stringify({workspace,genome,review,creator}).replaceAll('<','\\u003c');
    const bridge='<script>window.__MORPH_EMBEDDED__=true;window.__MORPH_WORKSPACE__='+state+';<\/script>';
    const next=document.createElement('iframe');
    next.id='workspace-frame';next.title=workspace==='creator'?'Monster creator':workspace==='review'?'Foundation inspector':'Creature workshop';
    next.srcdoc=documentHTML.replace('</head>',bridge+'</head>');
    // Remove the previous context. This stops its render loop and frees its DOM.
    host.replaceChildren(next);frame=next;
    document.documentElement.dataset.workspace=workspace;
    for(const button of document.querySelectorAll('[data-open-workspace]')){
      const selected=button.dataset.openWorkspace===workspace;
      button.setAttribute('aria-pressed',String(selected));button.disabled=selected;
    }
    status.textContent=workspace==='creator'?'Creator · randomize, save, mix':workspace==='review'?'Inspector · works offline':'Workshop · engine loading';
    next.addEventListener('load',()=>{
      status.textContent=workspace==='creator'?'Creator · randomize, save, mix':workspace==='review'?'Inspector · works offline':'Workshop · WebGL2 required';
    },{once:true});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-open-workspace]');
    if(button)openWorkspace(button.dataset.openWorkspace);
  });
  window.addEventListener('message',event=>{
    // Do not accept commands from other tabs, popups, or old workspace frames.
    if(!frame || event.source!==frame.contentWindow || event.data?.type!=='morph-lab:workspace')return;
    const {workspace,payload}=event.data;
    if(payload && typeof payload==='object')openWorkspace(workspace,payload);
  });
  const query=new URLSearchParams(location.search);
  const initial=query.has('creator')?'creator':query.has('workshop')?'workshop':query.has('review')?'review':document.documentElement.dataset.start;
  openWorkspace(initial);
})();
