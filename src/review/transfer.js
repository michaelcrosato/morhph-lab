import {serializeGenome,parseGenome} from '../core/genome.js';
import {workspaceURL} from '../core/workspace-route.js';

/** The combined HTML changes frames in place. No file navigation is used. */
function embeddedSwitch(workspace, payload = {}) {
  if (typeof window==='undefined' || !window.__MORPH_EMBEDDED__ || window.parent === window) return false;
  window.parent.postMessage({type:'morph-lab:workspace', workspace, payload}, '*');
  return true;
}
export function enterFoundationReview(genome) {
  const text = genome ? serializeGenome(genome) : null;
  if (embeddedSwitch('review', text ? {genome:JSON.parse(text)} : {})) return;
  // Keep edits in the current page when browser storage is blocked.
  if (text) {
    sessionStorage.setItem('morph-lab.review-transfer',text);
    sessionStorage.setItem('morph-lab.workshop-transfer',text);
  }
  location.assign(workspaceURL(location.href, 'review'));
}
export function enterWorkshop(genome, review) {
  const text = serializeGenome(genome);
  if (embeddedSwitch('workshop', {genome:JSON.parse(text), review})) return;
  if (review) sessionStorage.setItem('morph-lab.review-session',JSON.stringify(review));
  sessionStorage.setItem('morph-lab.workshop-transfer',text);
  location.assign(workspaceURL(location.href, 'workshop'));
}
export function takeReviewTransfer() {
  if (typeof window!=='undefined' && window.__MORPH_EMBEDDED__) return window.__MORPH_WORKSPACE__ || {};
  try {
    const data=sessionStorage.getItem('morph-lab.review-transfer');
    const review=sessionStorage.getItem('morph-lab.review-session');
    const genome=data ? parseGenome(data) : null;
    if (data) sessionStorage.removeItem('morph-lab.review-transfer');
    return {genome,review:review ? JSON.parse(review) : null};
  } catch { return {}; }
}
export function takeWorkshopTransfer() {
  if (typeof window!=='undefined' && window.__MORPH_EMBEDDED__) {
    const genome=window.__MORPH_WORKSPACE__?.genome;
    return genome ? parseGenome(JSON.stringify(genome)) : null;
  }
  try {
    const text=sessionStorage.getItem('morph-lab.workshop-transfer');
    if(!text)return null;
    const genome=parseGenome(text);
    sessionStorage.removeItem('morph-lab.workshop-transfer');
    return genome;
  } catch { return null; }
}

/** Return from an advanced workspace without losing the current creature. */
export function enterCreator(genome, review) {
  const text=genome ? serializeGenome(genome) : null;
  if(embeddedSwitch('creator', {...(text?{genome:JSON.parse(text)}:{}), ...(review?{review}:{})}))return;
  if(text)sessionStorage.setItem('morph-lab.creator-transfer',text);
  location.assign(workspaceURL(location.href,'creator'));
}
