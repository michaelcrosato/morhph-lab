import {add,sub,mul,dot,length,normalize,clamp,distance} from './math.js';
/** Analytic two-bone IK. Targets beyond reach are clamped; degenerate directions
 * and pole vectors are resolved without NaNs. Returns root-space positions. */
export function solveTwoBone(hip,target,upper,lower,pole=[0,0,1]){
  if(!(upper>0&&lower>0&&Number.isFinite(upper+lower)))throw new Error('IK bone lengths must be positive and finite.');
  const delta=sub(target,hip),rawDistance=length(delta),axis=normalize(delta,[0,-1,0]);
  const d=clamp(rawDistance,Math.abs(upper-lower)+1e-5,upper+lower-1e-5);
  let bend=sub(pole,mul(axis,dot(pole,axis)));
  if(length(bend)<1e-5){const alt=Math.abs(axis[0])<.9?[1,0,0]:[0,0,1];bend=sub(alt,mul(axis,dot(alt,axis)));}
  bend=normalize(bend);
  const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const knee=add(hip,add(mul(axis,along),mul(bend,height))),foot=add(hip,mul(axis,d));
  return {knee,foot,error:distance(foot,target),clamped:Math.abs(rawDistance-d)>1e-4};
}
