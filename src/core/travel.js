import {clamp} from './math.js';
export const TRAVEL_MEDIA=['ground','water','air'];
export const BODY_WAVES=['rigid','lateral','vertical','pulse'];
export const defaultTravel=()=>({medium:'ground',speed:3.4,climb:2.4,bank:.25});
export const defaultBodyWave=()=>({kind:'rigid',amplitude:.25,frequency:1,wavelength:2.6});
function range(value,fallback,lo,hi,name){const n=value===undefined?fallback:value;if(typeof n!=='number'||!Number.isFinite(n)||n<lo||n>hi)throw new Error('Invalid '+name+'. Use '+lo+' to '+hi+'.');return n;}
export function validateTravel(raw){if(raw===undefined)return defaultTravel();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Travel must be an object.');if(!TRAVEL_MEDIA.includes(raw.medium))throw new Error('Unknown travel medium.');return {medium:raw.medium,speed:range(raw.speed,3.4,.4,9,'cruise speed'),climb:range(raw.climb,2.4,.3,6,'vertical speed'),bank:range(raw.bank,.25,0,.7,'bank angle')};}
export function validateBodyWave(raw){if(raw===undefined)return defaultBodyWave();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Body wave must be an object.');if(!BODY_WAVES.includes(raw.kind))throw new Error('Unknown body deformation.');return {kind:raw.kind,amplitude:range(raw.amplitude,.25,0,.65,'wave amplitude'),frequency:range(raw.frequency,1,.1,3,'wave frequency'),wavelength:range(raw.wavelength,2.6,.6,8,'wave length')};}
export function blendTravel(a,b,t){return {medium:t<.5?a.medium:b.medium,...Object.fromEntries(['speed','climb','bank'].map(k=>[k,a[k]+(b[k]-a[k])*t]))};}
export function blendBodyWave(a,b,t){return {kind:t<.5?a.kind:b.kind,...Object.fromEntries(['amplitude','frequency','wavelength'].map(k=>[k,a[k]+(b[k]-a[k])*t]))};}
/** A bounded velocity controller. It is not a fluid or aerodynamic simulation. */
export function travelVelocity(config,input,position,bounds){
  const c=validateTravel(config);if(c.medium==='ground')throw new Error('Use the ground controller for ground movement.');
  const values=[input?.x??0,input?.z??0,input?.y??0,...[position.x,position.y,position.z]];if(values.some(v=>!Number.isFinite(v)))throw new Error('Travel input must be finite.');
  const x=clamp(input.x||0,-1,1),z=clamp(input.z||0,-1,1),y=clamp(input.y||0,-1,1),len=Math.max(1,Math.hypot(x,z,y));
  const gain=input.sprint?1.45:1,target={x:x/len*c.speed*gain,y:y/len*c.climb,z:z/len*c.speed*gain};
  const radius=bounds?.radius??20,minY=bounds?.minY??.8,maxY=bounds?.maxY??12;
  if(!Number.isFinite(radius)||radius<1||!Number.isFinite(minY)||!Number.isFinite(maxY)||minY>=maxY)throw new Error('Invalid travel volume.');
  const radial=Math.hypot(position.x,position.z),edge=radius-1.2;
  if(radial>edge){const nx=position.x/Math.max(.001,radial),nz=position.z/Math.max(.001,radial),outward=target.x*nx+target.z*nz;if(outward>0){const stop=clamp((radial-edge)/1.2,0,1);target.x-=outward*nx*stop;target.z-=outward*nz*stop;}if(radial>radius){target.x-=nx*Math.min(c.speed,(radial-radius)*3);target.z-=nz*Math.min(c.speed,(radial-radius)*3);}}
  if(position.y<minY+.8&&target.y<0)target.y*=clamp((position.y-minY)/.8,0,1);
  if(position.y>maxY-.8&&target.y>0)target.y*=clamp((maxY-position.y)/.8,0,1);
  if(position.y<minY)target.y=Math.max(target.y,Math.min(c.climb,(minY-position.y)*3));
  if(position.y>maxY)target.y=Math.min(target.y,-Math.min(c.climb,(position.y-maxY)*3));
  return target;
}
/** Rest-space body deformation. The front of the animal stays more stable. */
export function deformBodyPoint(point,wave,time,extent={min:-2,max:2}){
  const p=[...point];if(!wave||wave.kind==='rigid')return p;
  const tail=clamp((extent.max-p[2])/Math.max(.2,extent.max-extent.min),0,1),phase=time*wave.frequency*Math.PI*2+p[2]/wave.wavelength*Math.PI*2;
  if(wave.kind==='lateral')p[0]+=Math.sin(phase)*wave.amplitude*tail*tail;
  if(wave.kind==='vertical')p[1]+=Math.sin(phase)*wave.amplitude*tail*tail;
  if(wave.kind==='pulse'){const s=1+Math.sin(time*wave.frequency*Math.PI*2)*wave.amplitude*.16;p[0]*=s;p[2]*=s;p[1]/=s;}
  return p;
}
/** Central differences move an attachment normal with the same deformation. */
export function deformBodyFrame(point,normal,wave,time,extent){
  const position=deformBodyPoint(point,wave,time,extent);if(!wave||wave.kind==='rigid')return {position,normal:[...normal]};
  const e=.002,axis=Math.abs(normal[1])<.9?[0,1,0]:[1,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);},u=unit(cross(normal,axis)),v=unit(cross(normal,u));
  const tangent=a=>{const hi=deformBodyPoint(point.map((n,i)=>n+a[i]*e),wave,time,extent),lo=deformBodyPoint(point.map((n,i)=>n-a[i]*e),wave,time,extent);return hi.map((n,i)=>n-lo[i]);};
  return {position,normal:unit(cross(tangent(u),tangent(v)))};
}
