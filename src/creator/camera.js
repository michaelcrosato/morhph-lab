import {fitFrame,projection} from '../review/raster.js';
/** Fit the visible geometry, not the longest axis that may point into the screen. */
export function fitCreatorFrame(snapshots,width,height,view){
  const frame=fitFrame(snapshots),project=projection({...frame,span:1},view,width,height);
  let extentX=0,extentY=0;
  for(const snapshot of snapshots)for(const mesh of snapshot.meshes)for(let i=0;i<mesh.positions.length;i+=3){
    const p=project(mesh.positions.subarray(i,i+3));extentX=Math.max(extentX,Math.abs(p[0]-width/2));extentY=Math.max(extentY,Math.abs(p[1]-height/2));
  }
  frame.span=Math.max(2*extentX/(width*.84),2*extentY/(height*.72),.1);return frame;
}
