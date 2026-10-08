/** Pure math. No renderer, DOM or physics dependencies. All distances are metres. */
export const TAU = Math.PI * 2;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const mul = (a,s) => a.map(v=>v*s);
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const length = a => Math.hypot(...a);
export const normalize = (a, fallback=[0,1,0]) => length(a)>1e-8 ? mul(a,1/length(a)) : [...fallback];
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const distance = (a,b) => length(sub(a,b));
export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(text) { let h=2166136261; for(const c of String(text)) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function normalToAngles(v) { const n=normalize(v); return [Math.atan2(n[0],n[2]),Math.asin(clamp(n[1],-1,1))]; }
export const anglesToNormal = (az,el) => [Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)];
export function rotateY(v,yaw) {const c=Math.cos(yaw),s=Math.sin(yaw); return [c*v[0]+s*v[2],v[1],-s*v[0]+c*v[2]];}
export function shortestAngle(a,b) {return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
